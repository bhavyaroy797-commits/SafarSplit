'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  createExpenseSchema,
  tripIdParam,
} = require('../validators/expense.validator');
const ctrl = require('../controllers/expense.controller');

// Mounted at /api/v1/trips/:tripId/expenses
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', ctrl.listExpenses);
router.post('/', validate(createExpenseSchema), ctrl.createExpense);
router.get('/balances', ctrl.getBalances);
router.get('/settle-up', ctrl.getSettleUp);
router.get('/:expenseId', ctrl.getExpense);
router.delete('/:expenseId', ctrl.deleteExpense);

module.exports = router;