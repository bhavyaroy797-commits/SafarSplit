'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { createAttachmentMetaSchema } = require('../validators/attachment.validator');
const { tripIdParam } = require('../validators/itinerary.validator');
const ctrl = require('../controllers/attachment.controller');

// Mounted at /api/v1/trips/:tripId/attachments
const router = express.Router({ mergeParams: true });

router.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);

router.get('/', ctrl.listAttachments);
router.post(
  '/',
  upload.single('file'),
  validate(createAttachmentMetaSchema),
  ctrl.uploadAttachment
);

module.exports = router;

// Attachment-by-id routes (mounted separately at /api/v1/attachments)
const idRouter = express.Router();
idRouter.use(requireAuth);
idRouter.get('/:attachmentId/download', ctrl.downloadAttachment);
idRouter.delete('/:attachmentId', ctrl.deleteAttachment);

module.exports.idRouter = idRouter;