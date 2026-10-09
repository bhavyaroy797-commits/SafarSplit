'use strict';

const { z } = require('zod');

const createAttachmentMetaSchema = z.object({
  title: z.string().trim().max(150).optional(),
  kind: z
    .enum(['ticket', 'booking', 'receipt', 'other'])
    .default('other'),
});

const attachmentIdParam = z.object({ attachmentId: z.string().uuid() });
const tripIdParam = z.object({ tripId: z.string().uuid() });

module.exports = {
  createAttachmentMetaSchema,
  attachmentIdParam,
  tripIdParam,
};