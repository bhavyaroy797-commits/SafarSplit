'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const itineraryRoutes = require('./itinerary.routes');
const voteRoutes = require('./vote.routes');
const expenseRoutes = require('./expense.routes');
const walletRoutes = require('./wallet.routes');
const attachmentRoutes = require('./attachment.routes');
const aiRoutes = require('./ai.routes');

const { tripRouter: packingTripRouter, itemRouter: packingItemRouter } = require('./packing.routes');
const budgetRoutes = require('./budget.routes');
const wrappedRoutes = require('./wrapped.routes');
const communityRoutes = require('./community.routes');
const syncRoutes = require('./sync.routes');
const nextPayerRoutes = require('./nextPayer.routes');

const receiptRoutes = require('./receipt.routes');
const settlementRoutes = require('./settlement.routes');

// Migration 005 — assistant
const assistantRoutes = require('./assistant.routes');

const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { itemIdParam } = require('../validators/itinerary.validator');
const itineraryCtrl = require('../controllers/itinerary.controller');

const router = express.Router();

router.get('/health', (_req, res) =>
  res.json({
    success: true,
    data: { status: 'ok', service: 'safarsplit' },
    error: null,
  })
);

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/trips', tripRoutes);

router.use('/trips/:tripId/itinerary', itineraryRoutes);
router.use('/trips/:tripId/votes', voteRoutes);
router.use('/trips/:tripId/expenses', expenseRoutes);
router.use('/trips/:tripId/attachments', attachmentRoutes);
router.use('/trips/:tripId/ai', aiRoutes);

router.use('/trips/:tripId/packing', packingTripRouter);
router.use('/trips/:tripId/budget', budgetRoutes);
router.use('/trips/:tripId/wrapped', wrappedRoutes.tripRouter);
router.use('/trips/:tripId/next-payer', nextPayerRoutes);
router.use('/trips/:tripId', communityRoutes.publishRouter);

router.use('/trips/:tripId/receipts', receiptRoutes);
router.use('/trips/:tripId/settlement', settlementRoutes);

// Migration 005
router.use('/trips/:tripId/assistant', assistantRoutes);

router.patch(
  '/items/:itemId',
  requireAuth,
  validate(itemIdParam, 'params'),
  async (req, res, next) => {
    try {
      const itineraryService = require('../services/itinerary.service');
      const item = await itineraryService.getItem(req.params.itemId);
      req.params.tripId = item.trip_id;
      req.tripMember = { tripId: item.trip_id };
      return requireTripMember(req, res, () =>
        itineraryCtrl.updateItem(req, res, next)
      );
    } catch (err) {
      next(err);
    }
  },
  itineraryCtrl.updateItem
);

router.delete(
  '/items/:itemId',
  requireAuth,
  validate(itemIdParam, 'params'),
  async (req, res, next) => {
    try {
      const itineraryService = require('../services/itinerary.service');
      const item = await itineraryService.getItem(req.params.itemId);
      req.params.tripId = item.trip_id;
      return requireTripMember(req, res, () =>
        itineraryCtrl.deleteItem(req, res, next)
      );
    } catch (err) {
      next(err);
    }
  }
);

router.use('/packing-items', packingItemRouter);

const { idRouter: attachmentIdRouter } = require('./attachment.routes');
router.use('/attachments', attachmentIdRouter);

router.use('/public/wrapped', wrappedRoutes.publicRouter);
router.use('/community', communityRoutes.publicRouter);

router.use('/sync', syncRoutes);

module.exports = router;