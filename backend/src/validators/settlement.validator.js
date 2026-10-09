'use strict';

const { z } = require('zod');

const tripIdParam = z.object({ tripId: z.string().uuid() });

const markPaidSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  method: z.enum(['upi', 'cash', 'other']).default('upi'),
  reference: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
});

module.exports = { tripIdParam, markPaidSchema };