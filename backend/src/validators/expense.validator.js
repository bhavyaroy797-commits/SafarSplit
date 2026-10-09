'use strict';

const { z } = require('zod');
const { SPLIT_TYPES } = require('../config/constants');

const splitEntrySchema = z.object({
  userId: z.string().uuid(),
  amountPaise: z.number().int().nonnegative().optional(),
  percent: z.number().nonnegative().optional(),
  shares: z.number().nonnegative().optional(),
});

const createExpenseSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    amountPaise: z.number().int().positive('Amount must be > 0'),
    paidByUserId: z.string().uuid().optional(), // defaults to current user
    splitType: z.enum(Object.values(SPLIT_TYPES)),
    // For 'equal' with exclusions — pass the INCLUDED members:
    includedUserIds: z.array(z.string().uuid()).optional(),
    // For 'exact' | 'percent' | 'shares':
    entries: z.array(splitEntrySchema).optional(),
    category: z.string().trim().max(50).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    spentAt: z.string().datetime().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.splitType === SPLIT_TYPES.EQUAL) {
      if (!val.includedUserIds || val.includedUserIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['includedUserIds'],
          message: 'includedUserIds required for equal split',
        });
      }
    } else {
      if (!val.entries || val.entries.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries'],
          message: 'entries required for this split type',
        });
      }
      if (val.splitType === SPLIT_TYPES.EXACT) {
        const total = (val.entries || []).reduce(
          (s, e) => s + (e.amountPaise || 0),
          0
        );
        if (total !== val.amountPaise) {
          ctx.addIssue({
            code: 'custom',
            path: ['entries'],
            message: `Exact amounts must sum to ${val.amountPaise} paise (got ${total})`,
          });
        }
      }
      if (val.splitType === SPLIT_TYPES.PERCENT) {
        const totalPct = (val.entries || []).reduce(
          (s, e) => s + (e.percent || 0),
          0
        );
        if (Math.abs(totalPct - 100) > 0.01) {
          ctx.addIssue({
            code: 'custom',
            path: ['entries'],
            message: `Percents must sum to 100 (got ${totalPct})`,
          });
        }
      }
    }
  });

const expenseIdParam = z.object({ expenseId: z.string().uuid() });
const tripIdParam = z.object({ tripId: z.string().uuid() });

module.exports = { createExpenseSchema, expenseIdParam, tripIdParam };