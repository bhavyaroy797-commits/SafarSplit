'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { generateJoinCode } = require('../utils/joinCode');
const { ROLES } = require('../config/constants');

async function publishTrip(tripId, userId, { publicSummary, tags }) {
  const res = await db.query(
    `SELECT id, owner_id, status FROM trips WHERE id = $1`,
    [tripId]
  );
  const trip = res.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.owner_id !== userId) throw ApiError.forbidden('Only the owner can publish');
  if (trip.status !== 'completed') {
    throw ApiError.badRequest('Only completed trips can be published');
  }

  const { rows } = await db.query(
    `UPDATE trips
        SET is_public = TRUE,
            public_summary = $1,
            tags = $2::text[],
            published_at = NOW(),
            updated_at = NOW()
      WHERE id = $3
      RETURNING id, is_public, public_summary, tags, published_at`,
    [publicSummary, tags || [], tripId]
  );
  return rows[0];
}

async function unpublishTrip(tripId, userId) {
  const res = await db.query(
    'SELECT owner_id FROM trips WHERE id = $1',
    [tripId]
  );
  const trip = res.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.owner_id !== userId) throw ApiError.forbidden('Only the owner can unpublish');

  const { rows } = await db.query(
    `UPDATE trips
        SET is_public = FALSE,
            published_at = NULL,
            updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_public`,
    [tripId]
  );
  return rows[0];
}

/**
 * List public trips from community_trips view with filters + pagination.
 */
async function listCommunity(filters) {
  const where = [];
  const params = [];
  let i = 1;

  if (filters.q) {
    where.push(`(title ILIKE $${i} OR destination ILIKE $${i})`);
    params.push(`%${filters.q}%`);
    i++;
  }
  if (filters.destination) {
    where.push(`destination ILIKE $${i++}`);
    params.push(`%${filters.destination}%`);
  }
  if (filters.tags?.length) {
    where.push(`tags && $${i++}::text[]`);
    params.push(filters.tags);
  }
  if (filters.minDays) {
    where.push(`days >= $${i++}`);
    params.push(filters.minDays);
  }
  if (filters.maxDays) {
    where.push(`days <= $${i++}`);
    params.push(filters.maxDays);
  }
  if (filters.minBudgetPaise) {
    where.push(`budget_paise >= $${i++}`);
    params.push(filters.minBudgetPaise);
  }
  if (filters.maxBudgetPaise) {
    where.push(`budget_paise <= $${i++}`);
    params.push(filters.maxBudgetPaise);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql =
    filters.sort === 'most_forked'
      ? 'ORDER BY fork_count DESC, published_at DESC'
      : 'ORDER BY published_at DESC';

  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const countSql = `SELECT COUNT(*)::int AS c FROM community_trips ${whereSql}`;
  const countRes = await db.query(countSql, params);

  const listSql = `
    SELECT * FROM community_trips
    ${whereSql}
    ${orderSql}
    LIMIT $${i++} OFFSET $${i++}
  `;
  const listRes = await db.query(listSql, [...params, limit, offset]);

  return {
    total: countRes.rows[0].c,
    page: filters.page,
    limit,
    items: listRes.rows,
  };
}

/**
 * Public view of a single community trip — sanitized itinerary only.
 */
async function getCommunityTrip(tripId) {
  const res = await db.query(
    `SELECT trip_id, title, destination, days, budget_paise, fork_count,
            tags, published_at, owner_display_name, itinerary_item_count
       FROM community_trips WHERE trip_id = $1`,
    [tripId]
  );
  const trip = res.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found or not public');

  const itemsRes = await db.query(
    `SELECT day_number, position, title, place, latitude, longitude,
            duration_minutes, cost_estimate_paise, notes
       FROM itinerary_items
      WHERE trip_id = $1 AND status <> 'removed'
      ORDER BY day_number, position`,
    [tripId]
  );

  return { ...trip, itinerary: itemsRes.rows };
}

/**
 * Fork a public trip → new trip owned by the caller.
 * Copies itinerary items, shifts dates to the new startDate, resets statuses.
 */
async function forkTrip(tripId, userId, { title, startDate, budgetPaise }) {
  return db.withTransaction(async (client) => {
    const srcRes = await client.query(
      `SELECT id, start_date, end_date, destination, is_public
         FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );
    const src = srcRes.rows[0];
    if (!src) throw ApiError.notFound('Trip not found');
    if (!src.is_public) throw ApiError.forbidden('Trip is not public');

    const itemsRes = await client.query(
      `SELECT day_number, position, title, place, latitude, longitude,
              start_time, duration_minutes, cost_estimate_paise, notes
         FROM itinerary_items
        WHERE trip_id = $1 AND status <> 'removed'
        ORDER BY day_number, position`,
      [tripId]
    );

    // Compute new end date = startDate + (src end - src start)
    const srcStart = new Date(src.start_date);
    const srcEnd = new Date(src.end_date);
    const spanDays = Math.max(1, Math.round((srcEnd - srcStart) / 86400000) + 1);
    const newStart = new Date(startDate);
    const newEnd = new Date(newStart.getTime() + (spanDays - 1) * 86400000);

    // Generate a fresh join code
    let joinCode = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateJoinCode(6);
      const exists = await client.query(
        'SELECT 1 FROM trips WHERE join_code = $1',
        [candidate]
      );
      if (!exists.rows[0]) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) throw ApiError.internal('Could not generate join code');

    const newTripRes = await client.query(
      `INSERT INTO trips
         (owner_id, title, destination, start_date, end_date, budget_paise,
          currency, join_code, status, is_public, forked_from_trip_id)
       VALUES ($1,$2,$3,$4,$5,$6,'INR',$7,'planning',FALSE,$8)
       RETURNING *`,
      [
        userId,
        title,
        src.destination,
        newStart.toISOString().slice(0, 10),
        newEnd.toISOString().slice(0, 10),
        budgetPaise ?? null,
        joinCode,
        src.id,
      ]
    );
    const newTrip = newTripRes.rows[0];

    // Add owner as member
    await client.query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       VALUES ($1,$2,$3)`,
      [newTrip.id, userId, ROLES.OWNER]
    );

    // Copy itinerary items with status reset to 'proposed' and source preserved
    for (const item of itemsRes.rows) {
      await client.query(
        `INSERT INTO itinerary_items
            (trip_id, day_number, position, title, place, latitude, longitude,
             start_time, duration_minutes, cost_estimate_paise, notes,
             status, source, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'proposed','ai',$12)`,
        [
          newTrip.id,
          item.day_number,
          item.position,
          item.title,
          item.place,
          item.latitude,
          item.longitude,
          item.start_time,
          item.duration_minutes,
          item.cost_estimate_paise,
          item.notes,
          userId,
        ]
      );
    }

    // Increment fork_count on source
    await client.query(
      `UPDATE trips SET fork_count = fork_count + 1 WHERE id = $1`,
      [tripId]
    );

    return newTrip;
  });
}

module.exports = {
  publishTrip,
  unpublishTrip,
  listCommunity,
  getCommunityTrip,
  forkTrip,
};