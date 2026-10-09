'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const voteService = require('../services/vote.service');
const itineraryService = require('../services/itinerary.service');
const { getIO } = require('../sockets');

const castVote = asyncHandler(async (req, res) => {
  // The item's trip is derived from the item — enforced inside the service.
  const item = await itineraryService.getItem(req.body.itemId);
  const updated = await voteService.castVote({
    tripId: item.trip_id,
    itemId: req.body.itemId,
    userId: req.user.id,
    value: req.body.value,
  });
  const io = getIO();
  if (io) {
    io.to(`trip:${item.trip_id}`).emit('vote:updated', {
      itemId: updated.id,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
    });
  }
  return ok(res, updated);
});

const removeVote = asyncHandler(async (req, res) => {
  const item = await itineraryService.getItem(req.params.itemId);
  const updated = await voteService.removeVote({
    itemId: req.params.itemId,
    userId: req.user.id,
  });
  const io = getIO();
  if (io && updated) {
    io.to(`trip:${item.trip_id}`).emit('vote:updated', {
      itemId: updated.id,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
    });
  }
  return ok(res, { removed: true });
});

const listVotes = asyncHandler(async (req, res) => {
  const votes = await voteService.listVotesForTrip(req.params.tripId);
  return ok(res, votes);
});

module.exports = { castVote, removeVote, listVotes };