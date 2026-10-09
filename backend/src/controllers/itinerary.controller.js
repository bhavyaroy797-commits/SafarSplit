'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const itineraryService = require('../services/itinerary.service');
const { getIO } = require('../sockets');

const listItems = asyncHandler(async (req, res) => {
  const items = await itineraryService.listItems(req.params.tripId);
  return ok(res, items);
});

const createItem = asyncHandler(async (req, res) => {
  const item = await itineraryService.createItem(
    req.params.tripId,
    req.user.id,
    req.body
  );
  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('itinerary:created', item);
  return ok(res, item, 201);
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await itineraryService.updateItem(req.params.itemId, req.body);
  const io = getIO();
  if (io) io.to(`trip:${item.trip_id}`).emit('itinerary:updated', item);
  return ok(res, item);
});

const deleteItem = asyncHandler(async (req, res) => {
  const existing = await itineraryService.getItem(req.params.itemId);
  await itineraryService.deleteItem(req.params.itemId);
  const io = getIO();
  if (io) {
    io.to(`trip:${existing.trip_id}`).emit('itinerary:deleted', {
      itemId: req.params.itemId,
      tripId: existing.trip_id,
    });
  }
  return ok(res, { deleted: true });
});

const reorder = asyncHandler(async (req, res) => {
  await itineraryService.reorder(
    req.params.tripId,
    req.body.orderedItemIds,
    req.body.dayNumber
  );
  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('itinerary:reordered', {
      tripId: req.params.tripId,
      orderedItemIds: req.body.orderedItemIds,
      dayNumber: req.body.dayNumber ?? null,
    });
  }
  return ok(res, { reordered: true });
});

module.exports = { listItems, createItem, updateItem, deleteItem, reorder };