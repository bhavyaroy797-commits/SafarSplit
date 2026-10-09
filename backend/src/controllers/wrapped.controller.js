'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/wrapped.service');

const getWrapped = asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const data = await service.getWrapped(req.params.tripId, {
    force,
    userId: req.user.id,
  });
  return ok(res, data);
});

const shareWrapped = asyncHandler(async (req, res) => {
  const data = await service.rotateShareToken(req.params.tripId, req.user.id);
  return ok(res, data);
});

const getPublicWrapped = asyncHandler(async (req, res) => {
  const data = await service.getPublicWrappedByToken(req.params.token);
  return ok(res, data);
});

module.exports = { getWrapped, shareWrapped, getPublicWrapped };