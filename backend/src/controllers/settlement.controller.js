'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/settlement.service');
const { getIO } = require('../sockets');

const getSettlement = asyncHandler(async (req, res) => {
  const withAI = req.query.withAI !== 'false';
  const data = await service.getSettlement(req.params.tripId, { withAI });
  return ok(res, data);
});

const markPaid = asyncHandler(async (req, res) => {
  const payment = await service.markTransferPaid({
    tripId: req.params.tripId,
    fromUserId: req.body.fromUserId,
    toUserId: req.body.toUserId,
    amountPaise: req.body.amountPaise,
    method: req.body.method,
    reference: req.body.reference,
    note: req.body.note,
    markedBy: req.user.id,
  });

  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('settlement:paid', {
      tripId: req.params.tripId,
      payment,
    });
    // Recompute + broadcast the new settlement so everyone sees the update live.
    const refreshed = await service.getSettlement(req.params.tripId, { withAI: false });
    io.to(`trip:${req.params.tripId}`).emit('settlement:updated', refreshed);
  }

  return ok(res, payment, 201);
});

module.exports = { getSettlement, markPaid };