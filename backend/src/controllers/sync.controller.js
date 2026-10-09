'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/sync.service');
const { getIO } = require('../sockets');

const processSync = asyncHandler(async (req, res) => {
  const { tripId, ops } = req.body;
  const result = await service.processBatch(req.user.id, { tripId, ops });

  const io = getIO();
  if (io) {
    for (const r of result.results) {
      if (r.status !== 'applied' || !r.data) continue;
      if (r.data.expense) {
        io.to(`trip:${tripId}`).emit('expense:created', r.data.expense);
      } else if (r.data.item && r.data.item.claimed_by !== undefined) {
        io.to(`trip:${tripId}`).emit('packing:updated', r.data.item);
      } else if (r.data.item && r.data.item.upvotes !== undefined) {
        io.to(`trip:${tripId}`).emit('vote:updated', {
          itemId: r.data.item.id,
          upvotes: r.data.item.upvotes,
          downvotes: r.data.item.downvotes,
        });
      } else if (r.data.item) {
        io.to(`trip:${tripId}`).emit('itinerary:updated', r.data.item);
      }
    }
  }

  return ok(res, result);
});

module.exports = { processSync };