'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/community.service');
const { getIO } = require('../sockets');

const publish = asyncHandler(async (req, res) => {
  const trip = await service.publishTrip(req.params.tripId, req.user.id, req.body);
  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('trip:published', trip);
  return ok(res, trip);
});

const unpublish = asyncHandler(async (req, res) => {
  const trip = await service.unpublishTrip(req.params.tripId, req.user.id);
  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('trip:unpublished', trip);
  return ok(res, trip);
});

const list = asyncHandler(async (req, res) => {
  const result = await service.listCommunity(req.query);
  return ok(res, result);
});

const getOne = asyncHandler(async (req, res) => {
  const trip = await service.getCommunityTrip(req.params.tripId);
  return ok(res, trip);
});

const fork = asyncHandler(async (req, res) => {
  const trip = await service.forkTrip(req.params.tripId, req.user.id, req.body);
  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('trip:forked', {
      sourceTripId: req.params.tripId,
      newTripId: trip.id,
      byUserId: req.user.id,
    });
  }
  return ok(res, trip, 201);
});

module.exports = { publish, unpublish, list, getOne, fork };