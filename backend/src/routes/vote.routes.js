'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  castVoteSchema,
  itemIdParam,
} = require('../validators/vote.validator');
const { tripIdParam } = require('../validators/itinerary.validator');
const ctrl = require('../controllers/vote.controller');

// Mounted at /api/v1/trips/:tripId/votes
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', ctrl.listVotes);
router.post('/', validate(castVoteSchema), ctrl.castVote);
router.delete('/:itemId', validate(itemIdParam, 'params'), ctrl.removeVote);

module.exports = router;