'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Cast (or update) a vote on an itinerary item.
 * Uses row-locking on the item row so concurrent votes on the same item
 * can't interleave and produce wrong counts.
 */
async function castVote({ tripId, itemId, userId, value }) {
  return db.withTransaction(async (client) => {
    // 1. Lock the item row (ensures item exists & is in this trip).
    const itemRes = await client.query(
      `SELECT id, trip_id, upvotes, downvotes
         FROM itinerary_items
        WHERE id = $1
        FOR UPDATE`,
      [itemId]
    );
    const item = itemRes.rows[0];
    if (!item) throw ApiError.notFound('Itinerary item not found');
    if (item.trip_id !== tripId) {
      throw ApiError.badRequest('Item does not belong to this trip');
    }

    // 2. Check for existing vote by this user.
    const existing = await client.query(
      `SELECT id, value FROM votes
        WHERE item_id = $1 AND user_id = $2
        FOR UPDATE`,
      [itemId, userId]
    );

    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO votes (item_id, user_id, value) VALUES ($1,$2,$3)`,
        [itemId, userId, value]
      );
      await client.query(
        `UPDATE itinerary_items
            SET upvotes   = upvotes   + $1,
                downvotes = downvotes + $2,
                updated_at = NOW()
          WHERE id = $3`,
        [value === 'up' ? 1 : 0, value === 'down' ? 1 : 0, itemId]
      );
    } else if (existing.rows[0].value !== value) {
      await client.query(
        `UPDATE votes SET value = $1, updated_at = NOW() WHERE id = $2`,
        [value, existing.rows[0].id]
      );
      await client.query(
        `UPDATE itinerary_items
            SET upvotes   = upvotes   + $1,
                downvotes = downvotes + $2,
                updated_at = NOW()
          WHERE id = $3`,
        [value === 'up' ? 1 : -1, value === 'down' ? 1 : -1, itemId]
      );
    }
    // If same value, no-op.

    const finalItem = await client.query(
      `SELECT id, upvotes, downvotes FROM itinerary_items WHERE id = $1`,
      [itemId]
    );
    return finalItem.rows[0];
  });
}

async function removeVote({ itemId, userId }) {
  return db.withTransaction(async (client) => {
    const itemRes = await client.query(
      'SELECT id FROM itinerary_items WHERE id = $1 FOR UPDATE',
      [itemId]
    );
    if (!itemRes.rows[0]) throw ApiError.notFound('Itinerary item not found');

    const existing = await client.query(
      `SELECT id, value FROM votes
        WHERE item_id = $1 AND user_id = $2 FOR UPDATE`,
      [itemId, userId]
    );
    if (!existing.rows[0]) return null;

    const value = existing.rows[0].value;
    await client.query('DELETE FROM votes WHERE id = $1', [existing.rows[0].id]);
    await client.query(
      `UPDATE itinerary_items
          SET upvotes   = GREATEST(upvotes   - $1, 0),
              downvotes = GREATEST(downvotes - $2, 0),
              updated_at = NOW()
        WHERE id = $3`,
      [value === 'up' ? 1 : 0, value === 'down' ? 1 : 0, itemId]
    );

    const finalItem = await client.query(
      `SELECT id, upvotes, downvotes FROM itinerary_items WHERE id = $1`,
      [itemId]
    );
    return finalItem.rows[0];
  });
}

async function listVotesForTrip(tripId) {
  const { rows } = await db.query(
    `SELECT v.item_id, v.user_id, v.value
       FROM votes v
       JOIN itinerary_items i ON i.id = v.item_id
      WHERE i.trip_id = $1`,
    [tripId]
  );
  return rows;
}

module.exports = { castVote, removeVote, listVotesForTrip };