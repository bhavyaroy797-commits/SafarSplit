'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { syncBody } = require('../validators/sync.validator');
const ctrl = require('../controllers/sync.controller');

const router = express.Router();

router.post('/', requireAuth, validate(syncBody), ctrl.processSync);

module.exports = router;