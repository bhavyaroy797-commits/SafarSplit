'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  generateItinerarySchema,
  replanSchema,
  parseExpenseSchema,
  explainStopSchema,
} = require('../validators/ai.validator');
const { tripIdParam } = require('../validators/itinerary.validator');
const ctrl = require('../controllers/ai.controller');

// Mounted at /api/v1/trips/:tripId/ai
const router = express.Router({ mergeParams: true });

router.use(requireAuth, aiLimiter, validate(tripIdParam, 'params'), requireTripMember);

router.post('/generate-itinerary', validate(generateItinerarySchema), ctrl.generateItinerary);
router.post('/replan', validate(replanSchema), ctrl.replan);
router.post('/parse-expense', validate(parseExpenseSchema), ctrl.parseExpense);
router.post('/explain-stop', validate(explainStopSchema), ctrl.explainStop);

module.exports = router;