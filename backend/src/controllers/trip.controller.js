'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const tripService = require('../services/trip.service');
const { getIO } = require('../sockets');

const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.user.id, req.body);
  return ok(res, trip, 201);
});

const listMyTrips = asyncHandler(async (req, res) => {
  const trips = await tripService.listMyTrips(req.user.id);
  return ok(res, trips);
});

const getTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripWithMembers(req.params.tripId);
  return ok(res, trip);
});

const updateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.tripId, req.body);
  const io = getIO();
  if (io) io.to(`trip:${trip.id}`).emit('trip:updated', trip);
  return ok(res, trip);
});

const deleteTrip = asyncHandler(async (req, res) => {
  await tripService.deleteTrip(req.params.tripId);
  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('trip:deleted', { tripId: req.params.tripId });
  return ok(res, { deleted: true });
});

const joinTrip = asyncHandler(async (req, res) => {
  const result = await tripService.joinByCode(req.user.id, req.body.joinCode);
  const io = getIO();
  if (io) {
    io.to(`trip:${result.tripId}`).emit('member:joined', {
      tripId: result.tripId,
      userId: req.user.id,
      name: req.user.name,
    });
  }
  return ok(res, result);
});

module.exports = {
  createTrip,
  listMyTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  joinTrip,
};