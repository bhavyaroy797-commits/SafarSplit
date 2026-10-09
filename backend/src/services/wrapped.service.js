'use strict';

const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const { WRAPPED_AWARDS, EXPENSE_CATEGORIES } = require('../config/constants');

/**
 * Compute a "Safar Wrapped" recap for a completed trip.
 * Everything deterministic — AI only adds short captions.
 */
async function computeWrapped(tripId) {
  const tripRes = await db.query(
    `SELECT id, title, destination, start_date, end_date, status, owner_id
       FROM trips WHERE id = $1`,
    [tripId]
  );
  const trip = tripRes.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');

  const membersRes = await db.query(
    `SELECT tm.user_id, u.name
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
      WHERE tm.trip_id = $1`,
    [tripId]
  );
  const members = membersRes.rows;
  const nameById = new Map(members.map((m) => [m.user_id, m.name]));

  // ---- Totals ----
  const totalsRes = await db.query(
    `SELECT COALESCE(SUM(amount_paise),0)::bigint AS total
       FROM expenses WHERE trip_id = $1`,
    [tripId]
  );
  const totalSpentPaise = Number(totalsRes.rows[0].total);

  // ---- Paid per member ----
  const paidRes = await db.query(
    `SELECT paid_by_user_id AS user_id, COALESCE(SUM(amount_paise),0)::bigint AS paid
       FROM expenses WHERE trip_id = $1
      GROUP BY paid_by_user_id`,
    [tripId]
  );
  const paidById = new Map(paidRes.rows.map((r) => [r.user_id, Number(r.paid)]));

  // ---- Share per member ----
  const shareRes = await db.query(
    `SELECT s.user_id, COALESCE(SUM(s.share_paise),0)::bigint AS share
       FROM expense_splits s
       JOIN expenses e ON e.id = s.expense_id
      WHERE e.trip_id = $1
      GROUP BY s.user_id`,
    [tripId]
  );
  const shareById = new Map(shareRes.rows.map((r) => [r.user_id, Number(r.share)]));

  const perPerson = members.map((m) => ({
    userId: m.user_id,
    name: m.name,
    paidPaise: paidById.get(m.user_id) || 0,
    sharePaise: shareById.get(m.user_id) || 0,
  }));

  // ---- Category breakdown ----
  const catRes = await db.query(
    `SELECT COALESCE(category, 'other') AS cat, COALESCE(SUM(amount_paise),0)::bigint AS amt
       FROM expenses WHERE trip_id = $1
      GROUP BY COALESCE(category, 'other')`,
    [tripId]
  );
  const catTotals = new Map(
    catRes.rows.map((r) => [r.cat, Number(r.amt)])
  );
  for (const c of EXPENSE_CATEGORIES) if (!catTotals.has(c)) catTotals.set(c, 0);

  const categoryBreakdown = [...catTotals.entries()].map(([category, amountPaise]) => ({
    category,
    amountPaise,
    percent: totalSpentPaise > 0 ? Number(((amountPaise / totalSpentPaise) * 100).toFixed(1)) : 0,
  }));

  // ---- Awards ----
  const awards = [];

  if (perPerson.length) {
    // Ultimate Sponsor — paid the most upfront
    const sponsor = [...perPerson].sort((a, b) => b.paidPaise - a.paidPaise)[0];
    if (sponsor && sponsor.paidPaise > 0) {
      awards.push({
        key: WRAPPED_AWARDS.SPONSOR,
        title: 'The Ultimate Sponsor',
        userId: sponsor.userId,
        name: sponsor.name,
        valuePaise: sponsor.paidPaise,
      });
    }

    // Penny Pincher — lowest share
    const pincher = [...perPerson].sort((a, b) => a.sharePaise - b.sharePaise)[0];
    if (pincher && pincher.sharePaise > 0) {
      awards.push({
        key: WRAPPED_AWARDS.PINCHER,
        title: 'Penny Pincher',
        userId: pincher.userId,
        name: pincher.name,
        valuePaise: pincher.sharePaise,
      });
    }
  }

  // Chai Champion — most spent on tea category or chai/tea/coffee descriptions
  const chaiRes = await db.query(
    `SELECT paid_by_user_id AS user_id, COALESCE(SUM(amount_paise),0)::bigint AS amt
       FROM expenses
      WHERE trip_id = $1
        AND (category = 'tea' OR description ILIKE '%chai%' OR description ILIKE '%tea%' OR description ILIKE '%coffee%')
      GROUP BY paid_by_user_id
      ORDER BY amt DESC LIMIT 1`,
    [tripId]
  );
  if (chaiRes.rows[0] && Number(chaiRes.rows[0].amt) > 0) {
    awards.push({
      key: WRAPPED_AWARDS.CHAI,
      title: 'Chai Champion',
      userId: chaiRes.rows[0].user_id,
      name: nameById.get(chaiRes.rows[0].user_id) || 'Member',
      valuePaise: Number(chaiRes.rows[0].amt),
    });
  }

  // Biggest Splurge — single largest expense
  const splurgeRes = await db.query(
    `SELECT id, description, amount_paise, paid_by_user_id
       FROM expenses WHERE trip_id = $1
      ORDER BY amount_paise DESC LIMIT 1`,
    [tripId]
  );
  if (splurgeRes.rows[0]) {
    const s = splurgeRes.rows[0];
    awards.push({
      key: WRAPPED_AWARDS.SPLURGE,
      title: 'Biggest Splurge',
      userId: s.paid_by_user_id,
      name: nameById.get(s.paid_by_user_id) || 'Member',
      valuePaise: Number(s.amount_paise),
      note: s.description,
    });
  }

  // Settle-up Speedster — first member whose expense_splits were all settled
  const speedsterRes = await db.query(
    `SELECT s.user_id, MAX(s.settled_at) AS last_settled
       FROM expense_splits s
       JOIN expenses e ON e.id = s.expense_id
      WHERE e.trip_id = $1 AND s.settled = TRUE
      GROUP BY s.user_id
      ORDER BY last_settled ASC LIMIT 1`,
    [tripId]
  );
  if (speedsterRes.rows[0]) {
    const s = speedsterRes.rows[0];
    awards.push({
      key: WRAPPED_AWARDS.SPEEDSTER,
      title: 'Settle-up Speedster',
      userId: s.user_id,
      name: nameById.get(s.user_id) || 'Member',
      valuePaise: null,
      note: `Settled everything by ${new Date(s.last_settled).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    });
  }

  return {
    tripId,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    totalSpentPaise,
    memberCount: members.length,
    perPerson: perPerson.map((p) => ({
      userId: p.userId,
      firstName: p.name?.split(' ')[0] || 'Member',
      paidPaise: p.paidPaise,
      sharePaise: p.sharePaise,
      netPaise: p.paidPaise - p.sharePaise,
    })),
    categoryBreakdown,
    awards,
  };
}

/**
 * Get wrapped (with cache). `force` bypasses the cache.
 */
async function getWrapped(tripId, { force = false, userId } = {}) {
  const tripRes = await db.query(
    'SELECT id, status, owner_id, wrapped_cache, wrapped_generated_at FROM trips WHERE id = $1',
    [tripId]
  );
  const trip = tripRes.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');

  const isOwner = trip.owner_id === userId;
  if (trip.status !== 'completed' && !isOwner) {
    throw ApiError.forbidden('Wrapped is available only for completed trips');
  }

  if (!force && trip.wrapped_cache) {
    return { ...trip.wrapped_cache, cached: true, generatedAt: trip.wrapped_generated_at };
  }

  const core = await computeWrapped(tripId);

  // Best-effort captions — never blocks on AI.
  let captions = {};
  try {
    const ai = await Promise.race([
      aiService.wrappedCaptions({ tripId, wrapped: core }),
      new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (ai && typeof ai.captions === 'object') captions = ai.captions;
  } catch (_) {
    /* fallback below */
  }

  const fallbackCaptions = {
    [WRAPPED_AWARDS.SPONSOR]: 'Paisa pehle, pyaar baad mein. Legend payer!',
    [WRAPPED_AWARDS.CHAI]: 'Chai ke bina safar adhoora. 🍵',
    [WRAPPED_AWARDS.PINCHER]: 'Har paisa counted. Respect.',
    [WRAPPED_AWARDS.SPLURGE]: 'YOLO moment — worth it?',
    [WRAPPED_AWARDS.SPEEDSTER]: 'Settle-up speed: Formula 1 level. 🏁',
  };

  const withCaptions = {
    ...core,
    awards: core.awards.map((a) => ({
      ...a,
      caption: captions[a.key] || fallbackCaptions[a.key] || 'Shabaash!',
    })),
    cached: false,
  };

  await db.query(
    `UPDATE trips SET wrapped_cache = $1::jsonb, wrapped_generated_at = NOW()
      WHERE id = $2`,
    [JSON.stringify(withCaptions), tripId]
  );

  return withCaptions;
}

/**
 * Create or rotate the public share token for a wrapped recap.
 */
async function rotateShareToken(tripId, userId) {
  const tripRes = await db.query(
    'SELECT id, owner_id FROM trips WHERE id = $1',
    [tripId]
  );
  const trip = tripRes.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.owner_id !== userId) {
    throw ApiError.forbidden('Only the trip owner can share wrapped');
  }

  const token = crypto.randomBytes(18).toString('base64url');

  const { rows } = await db.query(
    `UPDATE trips SET wrapped_share_token = $1, wrapped_generated_at = NOW()
      WHERE id = $2
      RETURNING wrapped_share_token, wrapped_generated_at`,
    [token, tripId]
  );

  return {
    token: rows[0].wrapped_share_token,
    generatedAt: rows[0].wrapped_generated_at,
  };
}

/**
 * Public read by token. Returns sanitized summary — first names, totals, awards.
 * No emails, UPI IDs, or file data.
 */
async function getPublicWrappedByToken(token) {
  const tripRes = await db.query(
    `SELECT id, title, destination, start_date, end_date, wrapped_cache
       FROM trips WHERE wrapped_share_token = $1`,
    [token]
  );
  const trip = tripRes.rows[0];
  if (!trip) throw ApiError.notFound('Wrapped not found');

  // Ensure cache exists; regenerate if missing (still safe/public).
  let cache = trip.wrapped_cache;
  if (!cache) {
    cache = await getWrapped(trip.id, { force: true });
  }

  // Sanitize: keep only first names + values.
  const safe = {
    title: cache.title,
    destination: cache.destination,
    startDate: cache.startDate,
    endDate: cache.endDate,
    totalSpentPaise: cache.totalSpentPaise,
    memberCount: cache.memberCount,
    perPerson: (cache.perPerson || []).map((p) => ({
      firstName: p.firstName,
      paidPaise: p.paidPaise,
      sharePaise: p.sharePaise,
      netPaise: p.netPaise,
    })),
    categoryBreakdown: cache.categoryBreakdown,
    awards: (cache.awards || []).map((a) => ({
      key: a.key,
      title: a.title,
      firstName: a.name ? String(a.name).split(' ')[0] : null,
      valuePaise: a.valuePaise,
      note: a.note,
      caption: a.caption,
    })),
    generatedAt: trip.wrapped_cache ? new Date().toISOString() : new Date().toISOString(),
  };

  return safe;
}

module.exports = { getWrapped, rotateShareToken, getPublicWrappedByToken };