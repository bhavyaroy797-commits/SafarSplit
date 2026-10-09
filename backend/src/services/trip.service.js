'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { generateJoinCode } = require('../utils/joinCode');
const { ROLES } = require('../config/constants');

/**
 * Canonical budget column is `budget_paise`.
 * Accepts either `budgetPaise` or `budgetPerPersonPaise` from the client.
 */
function resolveBudgetPaise(payload) {
  if (payload.budgetPaise !== undefined) return payload.budgetPaise;
  if (payload.budgetPerPersonPaise !== undefined) return payload.budgetPerPersonPaise;
  return null;
}

async function createTrip(ownerId, payload) {
  return db.withTransaction(async (client) => {
    let joinCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateJoinCode(6);
      const exists = await client.query(
        'SELECT 1 FROM trips WHERE join_code = $1 LIMIT 1',
        [candidate]
      );
      if (!exists.rows[0]) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) throw ApiError.internal('Could not generate join code');

    const { rows } = await client.query(
      `INSERT INTO trips
         (owner_id, title, destination, description, start_date, end_date,
          budget_paise, currency, join_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        ownerId,
        payload.title,
        payload.destination,
        payload.description || null,
        payload.startDate,
        payload.endDate,
        resolveBudgetPaise(payload),
        payload.currency || 'INR',
        joinCode,
      ]
    );
    const trip = rows[0];

    await client.query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [trip.id, ownerId, ROLES.OWNER]
    );

    return trip;
  });
}

async function listMyTrips(userId) {
  const { rows } = await db.query(
    `SELECT t.*, tm.role AS my_role
       FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id
      WHERE tm.user_id = $1
      ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getTrip(tripId) {
  const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (!rows[0]) throw ApiError.notFound('Trip not found');
  return rows[0];
}

async function getTripWithMembers(tripId) {
  const trip = await getTrip(tripId);
  const members = await db.query(
    `SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email, u.upi_id
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
      WHERE tm.trip_id = $1
      ORDER BY tm.joined_at ASC`,
    [tripId]
  );
  return { ...trip, members: members.rows };
}

async function updateTrip(tripId, patch) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    title: 'title',
    destination: 'destination',
    description: 'description',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    isPublic: 'is_public',
    publicSummary: 'public_summary',
    tags: 'tags',
  };

  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(patch[k]);
    }
  }

  const budget = resolveBudgetPaise(patch);
  if (budget !== undefined && budget !== null) {
    fields.push(`budget_paise = $${i++}`);
    values.push(budget);
  }

  if (fields.length === 0) return getTrip(tripId);

  values.push(tripId);
  const { rows } = await db.query(
    `UPDATE trips SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *`,
    values
  );
  if (!rows[0]) throw ApiError.notFound('Trip not found');
  return rows[0];
}

async function deleteTrip(tripId) {
  const { rowCount } = await db.query('DELETE FROM trips WHERE id = $1', [tripId]);
  if (rowCount === 0) throw ApiError.notFound('Trip not found');
}

async function joinByCode(userId, joinCode) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id, owner_id FROM trips WHERE join_code = $1 FOR UPDATE',
      [joinCode]
    );
    const trip = rows[0];
    if (!trip) throw ApiError.notFound('Invalid join code');

    const existing = await client.query(
      'SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2',
      [trip.id, userId]
    );
    if (existing.rows[0]) return { tripId: trip.id, alreadyMember: true };

    await client.query(
      `INSERT INTO trip_members (trip_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [trip.id, userId, ROLES.MEMBER]
    );

    return { tripId: trip.id, alreadyMember: false };
  });
}

async function assertMember(tripId, userId) {
  const { rows } = await db.query(
    `SELECT role FROM trip_members
      WHERE trip_id = $1 AND user_id = $2 LIMIT 1`,
    [tripId, userId]
  );
  if (!rows[0]) throw ApiError.forbidden('You are not a member of this trip');
  return rows[0].role;
}

module.exports = {
  createTrip,
  listMyTrips,
  getTrip,
  getTripWithMembers,
  updateTrip,
  deleteTrip,
  joinByCode,
  assertMember,
};