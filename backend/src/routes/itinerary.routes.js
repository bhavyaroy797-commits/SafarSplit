'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  createItemSchema,
  updateItemSchema,
  reorderSchema,
  tripIdParam,
  itemIdParam,
} = require('../validators/itinerary.validator');
const ctrl = require('../controllers/itinerary.controller');

// Mounted at /api/v1/trips/:tripId/itinerary
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', ctrl.listItems);
router.post('/', validate(createItemSchema), ctrl.createItem);
router.post('/reorder', validate(reorderSchema), ctrl.reorder);

module.exports = router;