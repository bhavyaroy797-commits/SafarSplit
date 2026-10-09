'use strict';

const { z } = require('zod');
const { TRIP_STATUS } = require('../config/constants');

const createTripSchema = z.object({
  title: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  budgetPerPersonPaise: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).default('INR'),
});

const updateTripSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  destination: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budgetPerPersonPaise: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(Object.values(TRIP_STATUS)).optional(),
});

const joinTripSchema = z.object({
  joinCode: z.string().trim().min(4).max(12).toUpperCase(),
});

const tripIdParam = z.object({
  tripId: z.string().uuid('Invalid tripId'),
});

module.exports = {
  createTripSchema,
  updateTripSchema,
  joinTripSchema,
  tripIdParam,
};