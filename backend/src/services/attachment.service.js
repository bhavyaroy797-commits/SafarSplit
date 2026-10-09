'use strict';

const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function resolveUploadPath(storedName) {
  const root = path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.join(process.cwd(), env.UPLOAD_DIR);
  return path.join(root, storedName);
}

async function createAttachment(tripId, userId, file, meta) {
  if (!file) throw ApiError.badRequest('File is required');

  const { rows } = await db.query(
    `INSERT INTO attachments
       (trip_id, uploaded_by, original_name, stored_name, mime_type,
        size_bytes, kind, title)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      tripId,
      userId,
      file.originalname,
      file.filename,
      file.mimetype,
      file.size,
      meta.kind || 'other',
      meta.title || null,
    ]
  );
  return rows[0];
}

async function listAttachments(tripId) {
  const { rows } = await db.query(
    `SELECT a.*, u.name AS uploaded_by_name
       FROM attachments a
       JOIN users u ON u.id = a.uploaded_by
      WHERE a.trip_id = $1
      ORDER BY a.created_at DESC`,
    [tripId]
  );
  return rows;
}

async function getAttachment(attachmentId) {
  const { rows } = await db.query(
    'SELECT * FROM attachments WHERE id = $1 LIMIT 1',
    [attachmentId]
  );
  if (!rows[0]) throw ApiError.notFound('Attachment not found');
  return rows[0];
}

async function deleteAttachment(attachmentId, requesterId) {
  const attachment = await getAttachment(attachmentId);
  if (attachment.uploaded_by !== requesterId) {
    throw ApiError.forbidden('Only the uploader can delete this attachment');
  }
  await db.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

  // Best-effort remove from disk.
  try {
    const full = resolveUploadPath(attachment.stored_name);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.error('[attachment] failed to unlink file', err);
  }
}

module.exports = {
  createAttachment,
  listAttachments,
  getAttachment,
  deleteAttachment,
  resolveUploadPath,
};