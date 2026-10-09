'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/assistant.service');
const { getIO } = require('../sockets');

const send = asyncHandler(async (req, res) => {
  const result = await service.handleMessage({
    tripId: req.params.tripId,
    userId: req.user.id,
    text: req.body.text,
    conversationId: req.body.conversationId,
  });
  return ok(res, result, 200);
});

const confirm = asyncHandler(async (req, res) => {
  const result = await service.confirm({
    tripId: req.params.tripId,
    userId: req.user.id,
    conversationId: req.body.conversationId,
    draftPayload: req.body.draftPayload,
  });

  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('expense:created', result.expense);
  return ok(res, result, 201);
});

const confirmAll = asyncHandler(async (req, res) => {
  const result = await service.confirmMultiple({
    tripId: req.params.tripId,
    userId: req.user.id,
    conversationId: req.body.conversationId,
    draftPayload: req.body.draftPayload,
  });

  const io = getIO();
  if (io) {
    for (const e of result.expenses) {
      io.to(`trip:${req.params.tripId}`).emit('expense:created', e);
    }
  }
  return ok(res, result, 201);
});

const undo = asyncHandler(async (req, res) => {
  const result = await service.undo({
    tripId: req.params.tripId,
    userId: req.user.id,
    conversationId: req.body.conversationId,
    actionId: req.body.actionId,
  });

  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('expense:deleted', {
    expenseId: req.body.actionId,
    tripId: req.params.tripId,
  });
  return ok(res, result);
});

module.exports = { send, confirm, confirmAll, undo };