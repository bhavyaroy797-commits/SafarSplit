'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const {
  requireAuth,
  requireTripMember,
  requireTripOwner,
} = require('../middleware/auth');
const {
  createTripSchema,
  updateTripSchema,
  joinTripSchema,
  tripIdParam,
} = require('../validators/trip.validator');
const ctrl = require('../controllers/trip.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', validate(createTripSchema), ctrl.createTrip);
router.get('/', ctrl.listMyTrips);
router.post('/join', validate(joinTripSchema), ctrl.joinTrip);

router.get('/:tripId', validate(tripIdParam, 'params'), requireTripMember, ctrl.getTrip);
router.patch(
  '/:tripId',
  validate(tripIdParam, 'params'),
  requireTripMember,
  requireTripOwner,
  validate(updateTripSchema),
  ctrl.updateTrip
);
router.delete(
  '/:tripId',
  validate(tripIdParam, 'params'),
  requireTripMember,
  requireTripOwner,
  ctrl.deleteTrip
);

module.exports = router;