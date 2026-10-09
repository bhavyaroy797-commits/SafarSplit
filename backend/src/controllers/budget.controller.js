'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/budget.service');
const { getIO } = require('../sockets');

const getBudget = asyncHandler(async (req, res) => {
  const summary = await service.getBudgetSummary(req.params.tripId);
  return ok(res, summary);
});

const getSuggestions = asyncHandler(async (req, res) => {
  const maxSwaps = Number(req.query.maxSwaps) || 5;
  const result = await service.suggestSwaps(req.params.tripId, maxSwaps);
  return ok(res, result);
});

const applySwap = asyncHandler(async (req, res) => {
  const result = await service.applySwap(
    req.params.tripId,
    req.user.id,
    req.body
  );

  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('itinerary:updated', result.after);
    io.to(`trip:${req.params.tripId}`).emit('budget:swap-applied', {
      tripId: req.params.tripId,
      itemId: req.body.itemId,
      savingPaise: result.savingPaise,
    });
    const summary = await service.getBudgetSummary(req.params.tripId);
    io.to(`trip:${req.params.tripId}`).emit('budget:updated', summary);
  }

  return ok(res, result);
});

module.exports = { getBudget, getSuggestions, applySwap };