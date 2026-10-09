'use strict';

const { z } = require('zod');

const tripIdParam = z.object({ tripId: z.string().uuid() });

const applySwapSchema = z.object({
  itemId: z.string().uuid(),
  replacement: z.object({
    title: z.string().trim().min(1).max(150),
    place: z.string().trim().max(200).optional().nullable(),
    estimatedCostPaise: z.number().int().nonnegative(),
    reason: z.string().trim().max(500).optional().nullable(),
  }),
});

const suggestionsSchema = z.object({
  maxSwaps: z.coerce.number().int().min(1).max(5).default(5),
});

module.exports = { tripIdParam, applySwapSchema, suggestionsSchema };