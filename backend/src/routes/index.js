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

const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  itemIdParam,
} = require('../validators/itinerary.validator');
const itineraryCtrl = require('../controllers/itinerary.controller');

const router = express.Router();

// Health
router.get('/health', (_req, res) =>
  res.json({ success: true, data: { status: 'ok', service: 'safarsplit' }, error: null })
);

// Auth
router.use('/auth', authRoutes);

// Wallet (user-scoped)
router.use('/wallet', walletRoutes);

// Trips (top-level)
router.use('/trips', tripRoutes);

// Trip-scoped nested routers
router.use('/trips/:tripId/itinerary', itineraryRoutes);
router.use('/trips/:tripId/votes', voteRoutes);
router.use('/trips/:tripId/expenses', expenseRoutes);
router.use('/trips/:tripId/attachments', attachmentRoutes);
router.use('/trips/:tripId/ai', aiRoutes);

// Item-scoped routes (by itemId only)
// PATCH/DELETE /api/v1/items/:itemId  — validated by membership derived from item
router.patch(
  '/items/:itemId',
  requireAuth,
  validate(itemIdParam, 'params'),
  async (req, res, next) => {
    // Resolve tripId from the item, then reuse requireTripMember logic.
    try {
      const itineraryService = require('../services/itinerary.service');
      const item = await itineraryService.getItem(req.params.itemId);
      req.params.tripId = item.trip_id;
      req.body = req.body; // no-op, kept for clarity
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

// Attachment-by-id (download / delete)
const { idRouter: attachmentIdRouter } = require('./attachment.routes');
router.use('/attachments', attachmentIdRouter);

module.exports = router;