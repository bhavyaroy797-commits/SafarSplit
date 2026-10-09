'use strict';

const { z } = require('zod');

const createItemSchema = z.object({
  dayNumber: z.number().int().min(1).max(60),
  title: z.string().trim().min(1).max(150),
  place: z.string().trim().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)')
    .optional()
    .nullable(),
  costEstimatePaise: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  position: z.number().int().min(0).optional(),
});

const updateItemSchema = createItemSchema.partial();

const reorderSchema = z.object({
  // Full ordered list of itemIds for a given day (or trip, if dayNumber omitted)
  orderedItemIds: z.array(z.string().uuid()).min(1),
  dayNumber: z.number().int().min(1).max(60).optional(),
});

const itemIdParam = z.object({ itemId: z.string().uuid('Invalid itemId') });
const tripIdParam = z.object({ tripId: z.string().uuid('Invalid tripId') });

module.exports = {
  createItemSchema,
  updateItemSchema,
  reorderSchema,
  itemIdParam,
  tripIdParam,
};