'use strict';

const { z } = require('zod');

const suggestQuery = z.object({
  amount: z.coerce.number().int().positive(),
  exclude: z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
    ),
});

const tripIdParam = z.object({ tripId: z.string().uuid() });

module.exports = { suggestQuery, tripIdParam };