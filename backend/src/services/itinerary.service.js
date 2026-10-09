'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');

async function listItems(tripId) {
  const { rows } = await db.query(
    `SELECT * FROM itinerary_items
      WHERE trip_id = $1
      ORDER BY day_number ASC, position ASC, created_at ASC`,
    [tripId]
  );
  return rows;
}

async function createItem(tripId, userId, payload) {
  // Auto-assign position at end of the day if not provided.
  let position = payload.position;
  if (position === undefined || position === null) {
    const { rows } = await db.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next
         FROM itinerary_items WHERE trip_id = $1 AND day_number = $2`,
      [tripId, payload.dayNumber]
    );
    position = rows[0].next;
  }

  const { rows } = await db.query(
    `INSERT INTO itinerary_items
        (trip_id, day_number, title, place, lat, lng, start_time,
         cost_estimate_paise, notes, position, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      tripId,
      payload.dayNumber,
      payload.title,
      payload.place || null,
      payload.lat ?? null,
      payload.lng ?? null,
      payload.startTime || null,
      payload.costEstimatePaise ?? null,
      payload.notes || null,
      position,
      userId,
    ]
  );
  return rows[0];
}

async function getItem(itemId) {
  const { rows } = await db.query(
    'SELECT * FROM itinerary_items WHERE id = $1',
    [itemId]
  );
  if (!rows[0]) throw ApiError.notFound('Itinerary item not found');
  return rows[0];
}

async function updateItem(itemId, patch) {
  const map = {
    dayNumber: 'day_number',
    title: 'title',
    place: 'place',
    lat: 'lat',
    lng: 'lng',
    startTime: 'start_time',
    costEstimatePaise: 'cost_estimate_paise',
    notes: 'notes',
    position: 'position',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(patch[k]);
    }
  }
  if (fields.length === 0) return getItem(itemId);

  values.push(itemId);
  const { rows } = await db.query(
    `UPDATE itinerary_items SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING *`,
    values
  );
  if (!rows[0]) throw ApiError.notFound('Itinerary item not found');
  return rows[0];
}

async function deleteItem(itemId) {
  const { rowCount } = await db.query(
    'DELETE FROM itinerary_items WHERE id = $1',
    [itemId]
  );
  if (rowCount === 0) throw ApiError.notFound('Itinerary item not found');
}

/**
 * Reorder items (per day, or across the trip if dayNumber is undefined).
 * Must be atomic — if one id doesn't belong to the trip, abort.
 */
async function reorder(tripId, orderedItemIds, dayNumber) {
  return db.withTransaction(async (client) => {
    // Verify all ids belong to this trip (and same day if provided).
    const { rows: found } = await client.query(
      `SELECT id, day_number FROM itinerary_items
        WHERE trip_id = $1 AND id = ANY($2::uuid[])`,
      [tripId, orderedItemIds]
    );
    if (found.length !== orderedItemIds.length) {
      throw ApiError.badRequest('One or more items do not belong to this trip');
    }
    if (dayNumber !== undefined) {
      for (const r of found) {
        if (r.day_number !== dayNumber) {
          throw ApiError.badRequest(
            `Item ${r.id} is not on day ${dayNumber}`
          );
        }
      }
    }

    for (let i = 0; i < orderedItemIds.length; i++) {
      await client.query(
        'UPDATE itinerary_items SET position = $1, updated_at = NOW() WHERE id = $2',
        [i, orderedItemIds[i]]
      );
    }
  });
}

module.exports = {
  listItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  reorder,
};