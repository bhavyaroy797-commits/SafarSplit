'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const walletService = require('../services/wallet.service');

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getMyWallet(req.user.id);
  return ok(res, wallet);
});

const listTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const txs = await walletService.listTransactions(req.user.id, limit);
  return ok(res, txs);
});

const topUp = asyncHandler(async (req, res) => {
  const wallet = await walletService.topUp(
    req.user.id,
    req.body.amountPaise,
    req.body.note
  );
  return ok(res, wallet);
});

const transfer = asyncHandler(async (req, res) => {
  const result = await walletService.transfer(
    req.user.id,
    req.body.toUserId,
    req.body.amountPaise,
    req.body.note
  );
  return ok(res, result);
});

module.exports = { getMyWallet, listTransactions, topUp, transfer };