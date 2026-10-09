'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const {
  requireAuth,
  requireTripMember,
  requireTripOwner,
} = require('../middleware/auth');
const {
  tripIdParam,
  publishSchema,
  listQuery,
  forkSchema,
} = require('../validators/community.validator');
const ctrl = require('../controllers/community.controller');

// --- Public: /api/v1/community ---
const publicRouter = express.Router();
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: { message: 'Too many requests' } },
});

publicRouter.get('/trips', publicLimiter, validate(listQuery, 'query'), ctrl.list);
publicRouter.get(
  '/trips/:tripId',
  publicLimiter,
  validate(tripIdParam, 'params'),
  ctrl.getOne
);
publicRouter.post(
  '/trips/:tripId/fork',
  requireAuth,
  validate(tripIdParam, 'params'),
  validate(forkSchema),
  ctrl.fork
);

// --- Owner-only: /api/v1/trips/:tripId/publish|unpublish ---
const publishRouter = express.Router({ mergeParams: true });
publishRouter.use(
  requireAuth,
  validate(tripIdParam, 'params'),
  requireTripMember,
  requireTripOwner
);
publishRouter.post('/publish', validate(publishSchema), ctrl.publish);
publishRouter.post('/unpublish', ctrl.unpublish);

module.exports = { publicRouter, publishRouter };