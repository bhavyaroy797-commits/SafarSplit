'use strict';

const { z } = require('zod');
const { SYNC_OP_TYPES } = require('../config/constants');

const opSchema = z.object({
  clientOpId: z.string().uuid(),
  type: z.enum(SYNC_OP_TYPES),
  clientUuid: z.string().uuid().optional().nullable(),
  payload: z.record(z.any()).default({}),
  createdAt: z.string().datetime().optional(),
});

const syncBody = z.object({
  tripId: z.string().uuid(),
  ops: z.array(opSchema).min(1).max(200),
});

module.exports = { syncBody };