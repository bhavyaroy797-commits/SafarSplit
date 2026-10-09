'use strict';

const { z } = require('zod');

const tripIdParam = z.object({ tripId: z.string().uuid() });
const tokenParam = z.object({
  token: z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/, 'Invalid token'),
});
const generateQuery = z.object({
  force: z.enum(['true', 'false']).optional(),
});

module.exports = { tripIdParam, tokenParam, generateQuery };