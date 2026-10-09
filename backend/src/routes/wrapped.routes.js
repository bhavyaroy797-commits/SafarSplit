'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  tripIdParam,
  tokenParam,
  generateQuery,
} = require('../validators/wrapped.validator');
const ctrl = require('../controllers/wrapped.controller');

// --- Authenticated: /api/v1/trips/:tripId/wrapped ---
const tripRouter = express.Router({ mergeParams: true });
tripRouter.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);
tripRouter.get('/', validate(generateQuery, 'query'), ctrl.getWrapped);
tripRouter.post('/share', ctrl.shareWrapped);

// --- Public: /api/v1/public/wrapped/:token ---
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: { message: 'Too many requests' } },
});

const publicRouter = express.Router();
publicRouter.get(
  '/:token',
  publicLimiter,
  validate(tokenParam, 'params'),
  ctrl.getPublicWrapped
);

module.exports = { tripRouter, publicRouter };