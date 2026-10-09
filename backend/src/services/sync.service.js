'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const {
  SYNC_OP_TYPES,
  SYNC_OP_STATUS,
  SPLIT_TYPES,
} = require('../config/constants');
const { computeSplits } = require('../utils/splitter');

/**
 * Process a batch of offline ops. Each op runs in its own transaction so a
 * single failure doesn't poison the whole batch. Idempotency is guaranteed
 * via sync_ops.client_op_id (unique).
 *
 * Returns:
 *   { results: [{ clientOpId, status, error, data }], applied: {...}, state: {...} }
 */
async function processBatch(userId, { tripId, ops }) {
  // Validate membership once, up front.
  const member = await db.query(
    'SELECT role FROM trip_members WHERE trip_id = $1 AND user_id = $2',
    [tripId, userId]
  );
  if (!member.rows[0]) throw ApiError.forbidden('Not a member of this trip');

  const results = [];

  for (const op of ops) {
    try {
      const r = await processOne(userId, tripId, op);
      results.push(r);
    } catch (err) {
      results.push({
        clientOpId: op.clientOpId,
        status: SYNC_OP_STATUS.REJECTED,
        error: err.message,
        data: null,
      });
    }
  }

  // Return latest state of touched resources so the client can reconcile.
  const state = await collectTripState(tripId, results);

  return { results, state };
}

async function processOne(userId, tripId, op) {
  return db.withTransaction(async (client) => {
    // 1. Idempotency: try to insert into sync_ops. If the client_op_id already
    //    exists, we short-circuit and return "duplicate".
    const insRes = await client.query(
      `INSERT INTO sync_ops (client_op_id, user_id, trip_id, op_type, payload, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'applied')
       ON CONFLICT (client_op_id) DO NOTHING
       RETURNING id`,
      [op.clientOpId, userId, tripId, op.type, JSON.stringify(op.payload || {})]
    );

    if (!insRes.rows[0]) {
      // Already applied in a previous run
      const existing = await client.query(
        'SELECT status FROM sync_ops WHERE client_op_id = $1',
        [op.clientOpId]
      );
      return {
        clientOpId: op.clientOpId,
        status: SYNC_OP_STATUS.DUPLICATE,
        previousStatus: existing.rows[0]?.status || 'applied',
        data: null,
      };
    }

    // 2. Dispatch by type.
    let data = null;
    switch (op.type) {
      case 'expense.create':
        data = await applyExpenseCreate(client, tripId, userId, op);
        break;
      case 'vote.set':
        data = await applyVoteSet(client, tripId, userId, op);
        break;
      case 'packing.add':
        data = await applyPackingAdd(client, tripId, userId, op);
        break;
      case 'packing.claim':
        data = await applyPackingClaim(client, tripId, userId, op);
        break;
      case 'packing.pack':
        data = await applyPackingPack(client, tripId, userId, op);
        break;
      case 'itinerary.add':
        data = await applyItineraryAdd(client, tripId, userId, op);
        break;
      default:
        throw ApiError.badRequest(`Unsupported op type: ${op.type}`);
    }

    return {
      clientOpId: op.clientOpId,
      status: SYNC_OP_STATUS.APPLIED,
      data,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Op handlers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Expenses are additive. If clientUuid already exists in this trip, treat as
 * duplicate (and return the existing row) — safe to retry.
 */
async function applyExpenseCreate(client, tripId, userId, op) {
  const p = op.payload || {};
  if (!p.amountPaise || !p.title || !p.splitType) {
    throw ApiError.badRequest('expense.create requires title, amountPaise, splitType');
  }

  if (op.clientUuid) {
    const existing = await client.query(
      'SELECT * FROM expenses WHERE trip_id = $1 AND client_uuid = $2',
      [tripId, op.clientUuid]
    );
    if (existing.rows[0]) return { duplicate: true, expense: existing.rows[0] };
  }

  const paidBy = p.paidByUserId || userId;

  // Validate payer is a member
  const payerOk = await client.query(
    'SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2',
    [tripId, paidBy]
  );
  if (!payerOk.rows[0]) throw ApiError.badRequest('Payer is not a member');

  // Build splits
  const includedUserIds = p.includedUserIds || [];
  if (!includedUserIds.length) {
    const all = await client.query(
      'SELECT user_id FROM trip_members WHERE trip_id = $1',
      [tripId]
    );
    includedUserIds.push(...all.rows.map((r) => r.user_id));
  }

  const splitMap = computeSplits(p.amountPaise, p.splitType, {
    includedUserIds,
    entries: p.entries,
  });

  const expRes = await client.query(
    `INSERT INTO expenses
       (trip_id, title, amount_paise, paid_by_user_id, split_type,
        category, notes, spent_at, created_by, client_uuid)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, NOW()),$9,$10)
     RETURNING *`,
    [
      tripId,
      p.title,
      p.amountPaise,
      paidBy,
      p.splitType,
      p.category || null,
      p.notes || null,
      p.spentAt || null,
      userId,
      op.clientUuid || null,
    ]
  );
  const expense = expRes.rows[0];

  const values = [];
  const params = [];
  let i = 1;
  for (const [uid, amt] of splitMap.entries()) {
    values.push(`($${i++}, $${i++}, $${i++})`);
    params.push(expense.id, uid, amt);
  }
  if (values.length) {
    await client.query(
      `INSERT INTO expense_splits (expense_id, user_id, share_paise)
       VALUES ${values.join(', ')}`,
      params
    );
  }

  return { expense };
}

/**
 * Votes: last-write-wins by createdAt. Same client_uuid → duplicate.
 * We don't use createdAt for the "winner" here; the sync_ops table dedupes
 * retries, and the online `castVote` already handles changing values.
 */
async function applyVoteSet(client, tripId, userId, op) {
  const p = op.payload || {};
  const { itemId, value } = p;
  if (!itemId || !value || !['up', 'down'].includes(value)) {
    throw ApiError.badRequest('vote.set requires itemId and value (up|down)');
  }

  const itemRes = await client.query(
    'SELECT id, trip_id FROM itinerary_items WHERE id = $1',
    [itemId]
  );
  if (!itemRes.rows[0] || itemRes.rows[0].trip_id !== tripId) {
    throw ApiError.badRequest('Item does not belong to this trip');
  }

  // Upsert vote — unique on (item_id, user_id)
  const existing = await client.query(
    'SELECT id, value FROM votes WHERE item_id = $1 AND user_id = $2',
    [itemId, userId]
  );

  let oldValue = null;
  if (!existing.rows[0]) {
    await client.query(
      `INSERT INTO votes (item_id, user_id, value, client_uuid)
       VALUES ($1,$2,$3,$4)`,
      [itemId, userId, value, op.clientUuid || null]
    );
  } else if (existing.rows[0].value !== value) {
    oldValue = existing.rows[0].value;
    await client.query(
      'UPDATE votes SET value = $1, updated_at = NOW() WHERE id = $2',
      [value, existing.rows[0].id]
    );
  }

  // Apply counter deltas
  if (!existing.rows[0]) {
    await client.query(
      `UPDATE itinerary_items
          SET upvotes = upvotes + $1, downvotes = downvotes + $2, updated_at = NOW()
        WHERE id = $3`,
      [value === 'up' ? 1 : 0, value === 'down' ? 1 : 0, itemId]
    );
  } else if (oldValue && oldValue !== value) {
    await client.query(
      `UPDATE itinerary_items
          SET upvotes = upvotes + $1, downvotes = downvotes + $2, updated_at = NOW()
        WHERE id = $3`,
      [value === 'up' ? 1 : -1, value === 'down' ? 1 : -1, itemId]
    );
  }

  const item = await client.query(
    'SELECT id, upvotes, downvotes FROM itinerary_items WHERE id = $1',
    [itemId]
  );
  return { item: item.rows[0] };
}

/**
 * Packing items: additive. clientUuid per trip ensures idempotency even if
 * the same op somehow gets through twice.
 */
async function applyPackingAdd(client, tripId, userId, op) {
  const p = op.payload || {};
  if (!p.name) throw ApiError.badRequest('packing.add requires name');

  if (op.clientUuid) {
    const existing = await client.query(
      'SELECT * FROM packing_items WHERE trip_id = $1 AND client_uuid = $2',
      [tripId, op.clientUuid]
    );
    if (existing.rows[0]) return { duplicate: true, item: existing.rows[0] };
  }

  const res = await client.query(
    `INSERT INTO packing_items
       (trip_id, name, category, quantity, created_by, source, client_uuid)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      tripId,
      p.name,
      p.category || null,
      p.quantity || 1,
      userId,
      p.source || 'manual',
      op.clientUuid || null,
    ]
  );
  return { item: res.rows[0] };
}

/**
 * Packing claims: fail if already claimed by someone else. Idempotent for
 * the same user (re-claiming your own item returns applied).
 */
async function applyPackingClaim(client, tripId, userId, op) {
  const { itemId } = op.payload || {};
  if (!itemId) throw ApiError.badRequest('packing.claim requires itemId');

  const { rows } = await client.query(
    'SELECT * FROM packing_items WHERE id = $1 AND trip_id = $2 FOR UPDATE',
    [itemId, tripId]
  );
  const item = rows[0];
  if (!item) throw ApiError.notFound('Packing item not found');

  if (item.claimed_by && item.claimed_by !== userId) {
    const who = await client.query('SELECT name FROM users WHERE id = $1', [item.claimed_by]);
    throw ApiError.conflict(`Already claimed by ${who.rows[0]?.name || 'someone'}`);
  }

  const upd = await client.query(
    `UPDATE packing_items
        SET claimed_by = $1, claimed_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
    [userId, itemId]
  );
  return { item: upd.rows[0] };
}

async function applyPackingPack(client, tripId, userId, op) {
  const { itemId, isPacked = true } = op.payload || {};
  if (!itemId) throw ApiError.badRequest('packing.pack requires itemId');

  const { rows } = await client.query(
    'SELECT * FROM packing_items WHERE id = $1 AND trip_id = $2 FOR UPDATE',
    [itemId, tripId]
  );
  const item = rows[0];
  if (!item) throw ApiError.notFound('Packing item not found');

  // Only the claimer (or the item's creator) may toggle packed state.
  if (item.claimed_by && item.claimed_by !== userId && item.created_by !== userId) {
    throw ApiError.forbidden('Only the claimer can update packed state');
  }

  const upd = await client.query(
    `UPDATE packing_items SET is_packed = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *`,
    [!!isPacked, itemId]
  );
  return { item: upd.rows[0] };
}

/**
 * Itinerary items: additive with clientUuid uniqueness per trip.
 */
async function applyItineraryAdd(client, tripId, userId, op) {
  const p = op.payload || {};
  if (!p.dayNumber || !p.title) {
    throw ApiError.badRequest('itinerary.add requires dayNumber and title');
  }

  if (op.clientUuid) {
    const existing = await client.query(
      'SELECT * FROM itinerary_items WHERE trip_id = $1 AND client_uuid = $2',
      [tripId, op.clientUuid]
    );
    if (existing.rows[0]) return { duplicate: true, item: existing.rows[0] };
  }

  // Auto position at end of day
  const nextPos = await client.query(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next
       FROM itinerary_items WHERE trip_id = $1 AND day_number = $2`,
    [tripId, p.dayNumber]
  );

  const res = await client.query(
    `INSERT INTO itinerary_items
        (trip_id, day_number, position, title, place, latitude, longitude,
         start_time, duration_minutes, cost_estimate_paise, notes,
         status, source, created_by, client_uuid)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'proposed','manual',$12,$13)
     RETURNING *`,
    [
      tripId,
      p.dayNumber,
      nextPos.rows[0].next,
      p.title,
      p.place || null,
      p.latitude ?? null,
      p.longitude ?? null,
      p.startTime || null,
      p.durationMinutes ?? null,
      p.costEstimatePaise ?? null,
      p.notes || null,
      userId,
      op.clientUuid || null,
    ]
  );
  return { item: res.rows[0] };
}

/**
 * Return the latest server state of resources touched by this batch, so the
 * client can reconcile its offline cache.
 */
async function collectTripState(tripId, results) {
  const touched = new Set();
  const touchedItemIds = new Set();
  const touchedPackingIds = new Set();

  for (const r of results) {
    if (!r.data) continue;
    if (r.data.expense) touched.add('expenses');
    if (r.data.item && r.data.item.upvotes !== undefined) touched.add('itinerary');
    if (r.data.item && r.data.item.claimed_by !== undefined) touched.add('packing');
    if (r.data.item) touchedItemIds.add(r.data.item.id);
    if (r.data.item && r.data.item.claimed_by !== undefined) {
      touchedPackingIds.add(r.data.item.id);
    }
  }

  const state = {};

  if (touched.has('expenses')) {
    const r = await db.query(
      `SELECT e.*, u.name AS paid_by_name
         FROM expenses e JOIN users u ON u.id = e.paid_by_user_id
        WHERE e.trip_id = $1 ORDER BY e.created_at DESC LIMIT 50`,
      [tripId]
    );
    state.expenses = r.rows;
  }

  if (touched.has('itinerary')) {
    const r = await db.query(
      `SELECT * FROM itinerary_items WHERE trip_id = $1
        ORDER BY day_number, position`,
      [tripId]
    );
    state.itinerary = r.rows;
  }

  if (touched.has('packing')) {
    const r = await db.query(
      'SELECT * FROM packing_items WHERE trip_id = $1 ORDER BY created_at',
      [tripId]
    );
    state.packing = r.rows;
  }

  return state;
}

module.exports = { processBatch };