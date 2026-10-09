'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/receipt.service');
const { getIO, emitToTrip } = require('../sockets');

const scan = asyncHandler(async (req, res) => {
  const draft = await service.readImage({
    tripId: req.params.tripId,
    userId: req.user.id,
    file: req.file,
  });
  return ok(res, draft, 201);
});

const confirm = asyncHandler(async (req, res) => {
  const result = await service.confirmReceipt({
    tripId: req.params.tripId,
    userId: req.user.id,
    attachmentMeta: req.body.attachmentMeta,
    payload: req.body,
  });

  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('expense:created', result.expense);
    emitToTrip(req.params.tripId, 'receipt:confirmed', {
      receiptId: result.receipt.id,
      expenseId: result.expense.id,
    });
  }

  return ok(res, result, 201);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getReceipt(req.params.rid);
  return ok(res, data);
});

module.exports = { scan, confirm, getOne };