'use strict';

const { z } = require('zod');
const { WALLET_TX_TYPES } = require('../config/constants');

const topUpSchema = z.object({
  amountPaise: z.number().int().positive(),
  note: z.string().trim().max(200).optional(),
});

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  note: z.string().trim().max(200).optional(),
});

const tripIdParam = z.object({ tripId: z.string().uuid() });

module.exports = {
  topUpSchema,
  transferSchema,
  tripIdParam,
  WALLET_TX_TYPES,
};