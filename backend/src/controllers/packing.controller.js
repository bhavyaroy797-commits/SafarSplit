'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/packing.service');
const tripService = require('../services/trip.service');
const aiService = require('../services/ai.service');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getIO } = require('../sockets');

function emit(tripId, event, payload) {
  const io = getIO();
  if (io) io.to(`trip:${tripId}`).emit(event, payload);
}

/**
 * Look up the trip_id for a packing item; throw 404 if missing.
 */
async function resolveTripId(itemId) {
  const { rows } = await db.query(
    'SELECT trip_id FROM packing_items WHERE id = $1',
    [itemId]
  );
  if (!rows[0]) throw ApiError.notFound('Packing item not found');
  return rows[0].trip_id;
}

const list = asyncHandler(async (req, res) => {
  const items = await service.listItems(req.params.tripId, req.query);
  return ok(res, items);
});

const create = asyncHandler(async (req, res) => {
  const result = await service.createItem(req.params.tripId, req.user.id, req.body);
  emit(req.params.tripId, 'packing:updated', result.item);
  return ok(res, result, 201);
});

const update = asyncHandler(async (req, res) => {
  const tripId = await resolveTripId(req.params.itemId);
  await tripService.assertMember(tripId, req.user.id);
  const item = await service.updateItem(req.params.itemId, req.body);
  emit(tripId, 'packing:updated', item);
  return ok(res, item);
});

const remove = asyncHandler(async (req, res) => {
  const tripId = await resolveTripId(req.params.itemId);
  await tripService.assertMember(tripId, req.user.id);
  await service.deleteItem(req.params.itemId);
  emit(tripId, 'packing:deleted', { itemId: req.params.itemId, tripId });
  return ok(res, { deleted: true });
});

const claim = asyncHandler(async (req, res) => {
  const tripId = await resolveTripId(req.params.itemId);
  const role = await tripService.assertMember(tripId, req.user.id);

  const forUserId = req.body?.forUserId;
  if (forUserId && forUserId !== req.user.id && role !== 'owner') {
    throw ApiError.forbidden('Only the trip owner can claim for another member');
  }

  const result = await service.claimItem({
    itemId: req.params.itemId,
    userId: req.user.id,
    forUserId,
  });

  if (result.alreadyClaimedBy) {
    return res.status(409).json({
      success: false,
      data: { claimedBy: result.alreadyClaimedBy },
      error: { message: `Already claimed by ${result.alreadyClaimedBy.name}` },
    });
  }

  emit(tripId, 'packing:updated', result.item);
  return ok(res, result.item);
});

const unclaim = asyncHandler(async (req, res) => {
  const tripId = await resolveTripId(req.params.itemId);
  const role = await tripService.assertMember(tripId, req.user.id);
  const item = await service.unclaimItem(
    req.params.itemId,
    req.user.id,
    role === 'owner'
  );
  emit(tripId, 'packing:updated', item);
  return ok(res, item);
});

const pack = asyncHandler(async (req, res) => {
  const tripId = await resolveTripId(req.params.itemId);
  const role = await tripService.assertMember(tripId, req.user.id);
  const isPacked = req.body?.isPacked !== false;
  const item = await service.markPacked(
    req.params.itemId,
    isPacked,
    req.user.id,
    role === 'owner'
  );
  emit(tripId, 'packing:updated', item);
  return ok(res, item);
});

const bulkClaim = asyncHandler(async (req, res) => {
  const result = await service.bulkClaim({
    itemIds: req.body.itemIds,
    userId: req.user.id,
  });
  for (const it of result.claimed) emit(it.trip_id, 'packing:updated', it);
  return ok(res, result);
});

const suggest = asyncHandler(async (req, res) => {
  const trip = await tripService.getTrip(req.params.tripId);

  const itemsRes = await db.query(
    `SELECT title, place FROM itinerary_items
      WHERE trip_id = $1 AND status <> 'removed'`,
    [req.params.tripId]
  );

  const memberRes = await db.query(
    'SELECT COUNT(*)::int AS c FROM trip_members WHERE trip_id = $1',
    [req.params.tripId]
  );

  const startMonth = new Date(trip.start_date).getUTCMonth();
  const season =
    startMonth >= 2 && startMonth <= 5
      ? 'summer'
      : startMonth >= 6 && startMonth <= 8
      ? 'monsoon'
      : startMonth >= 9 && startMonth <= 10
      ? 'autumn'
      : 'winter';

  const result = await aiService.packingSuggest({
    tripId: req.params.tripId,
    userId: req.user.id,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    season,
    groupSize: memberRes.rows[0].c || 1,
    itineraryItems: itemsRes.rows,
    notes: req.body?.notes,
  });

  return ok(res, result);
});

module.exports = {
  list,
  create,
  update,
  remove,
  claim,
  unclaim,
  pack,
  bulkClaim,
  suggest,
};