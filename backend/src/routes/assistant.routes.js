'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  tripIdParam,
  messageSchema,
  confirmSchema,
  undoSchema,
} = require('../validators/assistant.validator');
const ctrl = require('../controllers/assistant.controller');

// Mounted at /api/v1/trips/:tripId/assistant
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.post('/message', aiLimiter, validate(messageSchema), ctrl.send);
router.post('/confirm', validate(confirmSchema), ctrl.confirm);
router.post('/confirm-all', validate(confirmSchema), ctrl.confirmAll);
router.post('/undo', validate(undoSchema), ctrl.undo);

module.exports = router;