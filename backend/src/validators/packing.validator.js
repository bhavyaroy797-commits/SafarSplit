'use strict';

const { z } = require('zod');
const { PACKING_CATEGORIES } = require('../config/constants');

const categoryEnum = z.enum(PACKING_CATEGORIES);

const createItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: categoryEnum.optional().nullable(),
  quantity: z.number().int().positive().max(999).default(1),
  source: z.enum(['manual', 'ai']).optional().default('manual'),
  clientUuid: z.string().uuid().optional(),
});

const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: categoryEnum.optional().nullable(),
  quantity: z.number().int().positive().max(999).optional(),
  isPacked: z.boolean().optional(),
});

const claimSchema = z.object({
  forUserId: z.string().uuid().optional(),
});

const bulkClaimSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(100),
});

const listQuery = z.object({
  category: categoryEnum.optional(),
  packed: z.enum(['true', 'false']).optional(),
  claimed: z.enum(['true', 'false', 'none']).optional(),
});

const suggestSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

const tripIdParam = z.object({ tripId: z.string().uuid() });
const itemIdParam = z.object({ itemId: z.string().uuid() });

module.exports = {
  createItemSchema,
  updateItemSchema,
  claimSchema,
  bulkClaimSchema,
  listQuery,
  suggestSchema,
  tripIdParam,
  itemIdParam,
};