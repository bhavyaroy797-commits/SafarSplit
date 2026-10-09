'use strict';

const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const attachmentService = require('../services/attachment.service');
const { getIO } = require('../sockets');

const uploadAttachment = asyncHandler(async (req, res) => {
  const attachment = await attachmentService.createAttachment(
    req.params.tripId,
    req.user.id,
    req.file,
    req.body || {}
  );
  const io = getIO();
  if (io) io.to(`trip:${req.params.tripId}`).emit('attachment:created', attachment);
  return ok(res, attachment, 201);
});

const listAttachments = asyncHandler(async (req, res) => {
  const attachments = await attachmentService.listAttachments(req.params.tripId);
  return ok(res, attachments);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await attachmentService.getAttachment(req.params.attachmentId);
  const full = attachmentService.resolveUploadPath(attachment.stored_name);
  if (!fs.existsSync(full)) {
    return res.status(404).json({
      success: false,
      data: null,
      error: { message: 'File missing on disk' },
    });
  }
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(attachment.original_name)}"`
  );
  return fs.createReadStream(full).pipe(res);
});

const deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = await attachmentService.getAttachment(req.params.attachmentId);
  await attachmentService.deleteAttachment(req.params.attachmentId, req.user.id);
  const io = getIO();
  if (io) {
    io.to(`trip:${attachment.trip_id}`).emit('attachment:deleted', {
      attachmentId: attachment.id,
      tripId: attachment.trip_id,
    });
  }
  return ok(res, { deleted: true });
});

module.exports = {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment,
};