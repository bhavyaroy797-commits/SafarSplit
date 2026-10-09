'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { tripIdParam, markPaidSchema } = require('../validators/settlement.validator');
const ctrl = require('../controllers/settlement.controller');

// Mounted at /api/v1/trips/:tripId/settlement
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', aiLimiter, ctrl.getSettlement);
router.post('/pay', validate(markPaidSchema), ctrl.markPaid);

module.exports = router;