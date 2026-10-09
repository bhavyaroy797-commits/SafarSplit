'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  tripIdParam,
  applySwapSchema,
  suggestionsSchema,
} = require('../validators/budget.validator');
const ctrl = require('../controllers/budget.controller');

// Mounted at /api/v1/trips/:tripId/budget
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', ctrl.getBudget);
router.get(
  '/suggestions',
  aiLimiter,
  validate(suggestionsSchema, 'query'),
  ctrl.getSuggestions
);
router.post('/apply', validate(applySwapSchema), ctrl.applySwap);

module.exports = router;