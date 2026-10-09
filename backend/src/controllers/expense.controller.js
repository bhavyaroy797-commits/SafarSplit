'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const expenseService = require('../services/expense.service');
const { getIO } = require('../sockets');

const createExpense = asyncHandler(async (req, res) => {
  const result = await expenseService.createExpense(
    req.params.tripId,
    req.user.id,
    req.body
  );

  const io = getIO();
  if (io) {
    io.to(`trip:${req.params.tripId}`).emit('expense:created', result.expense);
    // Settle-up set changes after every expense — broadcast the new one.
    const settle = await expenseService.getSettleUp(req.params.tripId);
    io.to(`trip:${req.params.tripId}`).emit('settleup:updated', settle);
  }

  return ok(res, result, 201);
});

const listExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.listExpenses(req.params.tripId);
  return ok(res, expenses);
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpense(req.params.expenseId);
  return ok(res, expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpense(req.params.expenseId);
  await expenseService.deleteExpense(req.params.expenseId);

  const io = getIO();
  if (io) {
    io.to(`trip:${expense.trip_id}`).emit('expense:deleted', {
      expenseId: expense.id,
      tripId: expense.trip_id,
    });
    const settle = await expenseService.getSettleUp(expense.trip_id);
    io.to(`trip:${expense.trip_id}`).emit('settleup:updated', settle);
  }

  return ok(res, { deleted: true });
});

const getBalances = asyncHandler(async (req, res) => {
  const balances = await expenseService.computeBalances(req.params.tripId);
  return ok(res, [...balances.entries()].map(([userId, amountPaise]) => ({
    userId,
    amountPaise,
  })));
});

const getSettleUp = asyncHandler(async (req, res) => {
  const settle = await expenseService.getSettleUp(req.params.tripId);
  return ok(res, settle);
});

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  deleteExpense,
  getBalances,
  getSettleUp,
};