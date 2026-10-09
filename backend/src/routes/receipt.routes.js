'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../middleware/upload');
const {
  tripIdParam,
  receiptIdParam,
  confirmSchema,
} = require('../validators/receipt.validator');
const ctrl = require('../controllers/receipt.controller');

// Mounted at /api/v1/trips/:tripId/receipts
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

// Fast path: confirm a fresh scan without a pre-created receipt id.
// MUST be declared before `/:rid/confirm` so it doesn't get shadowed.
router.post(
  '/confirm',
  validate(confirmSchema),
  (req, res, next) => {
    req.params.rid = 'fresh';
    return ctrl.confirm(req, res, next);
  }
);

// Scan: accepts an image; vision model call is rate-limited.
router.post(
  '/',
  aiLimiter,
  upload.single('image'),
  ctrl.scan
);

// Confirm with an existing receipt id.
router.post(
  '/:rid/confirm',
  validate(receiptIdParam, 'params'),
  validate(confirmSchema),
  ctrl.confirm
);

router.get('/:rid', validate(receiptIdParam, 'params'), ctrl.getOne);

module.exports = router;