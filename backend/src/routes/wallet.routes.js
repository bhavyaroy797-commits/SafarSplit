'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  topUpSchema,
  transferSchema,
} = require('../validators/wallet.validator');
const ctrl = require('../controllers/wallet.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.getMyWallet);
router.get('/transactions', ctrl.listTransactions);
router.post('/top-up', validate(topUpSchema), ctrl.topUp);
router.post('/transfer', validate(transferSchema), ctrl.transfer);

module.exports = router;