'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const service = require('../services/nextPayer.service');

const suggest = asyncHandler(async (req, res) => {
  const { amount, exclude } = req.query;
  const result = await service.getNextPayer({
    tripId: req.params.tripId,
    amountPaise: Number(amount),
    excludeUserIds: exclude,
  });
  return ok(res, result);
});

module.exports = { suggest };