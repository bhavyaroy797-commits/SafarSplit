'use strict';

const { z } = require('zod');

const generateItinerarySchema = z.object({
  destination: z.string().trim().min(2).max(120),
  days: z.number().int().min(1).max(30),
  groupSize: z.number().int().min(1).max(50),
  budgetPerPersonPaise: z.number().int().nonnegative().optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  foodPreference: z
    .enum(['veg', 'non-veg', 'jain', 'vegan', 'any'])
    .default('any'),
  notes: z.string().trim().max(1000).optional(),
});

const replanSchema = z.object({
  reason: z.string().trim().min(2).max(500),
  affectedDayNumbers: z.array(z.number().int().min(1).max(60)).min(1),
});

const parseExpenseSchema = z.object({
  text: z.string().trim().min(3).max(1000),
});

const explainStopSchema = z.object({
  itemId: z.string().uuid(),
});

module.exports = {
  generateItinerarySchema,
  replanSchema,
  parseExpenseSchema,
  explainStopSchema,
};