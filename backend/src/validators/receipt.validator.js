'use strict';

const { z } = require('zod');

const tripIdParam = z.object({ tripId: z.string().uuid() });
const receiptIdParam = z.object({
  tripId: z.string().uuid(),
  rid: z.string().uuid(),
});

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.coerce.number().positive().max(999),
  unitPricePaise: z.number().int().nonnegative(),
  lineTotalPaise: z.number().int().nonnegative(),
  dietClass: z.enum(['veg', 'egg', 'non_veg', 'unknown']).default('unknown'),
  jainOk: z.boolean().default(true),
  category: z.string().trim().max(50).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
  needsManual: z.boolean().optional().default(false),
});

const createReceiptSchema = z.object({
  merchant: z.string().trim().max(200).optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional()
    .nullable(),
  items: z.array(itemSchema).min(1).max(200),
  subtotalPaise: z.number().int().nonnegative().optional().nullable(),
  taxesPaise: z.number().int().nonnegative().default(0),
  serviceChargePaise: z.number().int().nonnegative().default(0),
  discountPaise: z.number().int().nonnegative().default(0),
  deliveryPaise: z.number().int().nonnegative().default(0),
  totalPaise: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const confirmSchema = z.object({
  // Optional overrides of the auto-computed assignment
  assignments: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1),
      })
    )
    .optional(),
  title: z.string().trim().min(1).max(150).optional(),
  category: z.enum(['food', 'transport', 'stay', 'activities', 'tea', 'other']).optional(),
});

module.exports = {
  tripIdParam,
  receiptIdParam,
  createReceiptSchema,
  confirmSchema,
};