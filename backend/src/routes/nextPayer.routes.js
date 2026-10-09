'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const {
  suggestQuery,
  tripIdParam,
} = require('../validators/nextPayer.validator');
const ctrl = require('../controllers/nextPayer.controller');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);
router.get('/', validate(suggestQuery, 'query'), ctrl.suggest);

module.exports = router;