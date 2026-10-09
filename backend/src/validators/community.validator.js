'use strict';

const { z } = require('zod');

const tripIdParam = z.object({ tripId: z.string().uuid() });

const publishSchema = z.object({
  publicSummary: z.string().trim().min(3).max(280),
  tags: z.array(z.string().trim().min(1).max(24)).max(10).default([]),
});

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  destination: z.string().trim().max(80).optional(),
  tags: z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
    ),
  minDays: z.coerce.number().int().min(1).max(60).optional(),
  maxDays: z.coerce.number().int().min(1).max(60).optional(),
  minBudgetPaise: z.coerce.number().int().nonnegative().optional(),
  maxBudgetPaise: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'most_forked']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const forkSchema = z.object({
  title: z.string().trim().min(2).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  budgetPaise: z.number().int().nonnegative().optional(),
});

module.exports = { tripIdParam, publishSchema, listQuery, forkSchema };