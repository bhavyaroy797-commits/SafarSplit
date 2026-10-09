'use strict';

/**
 * Consistent JSON envelope: { success, data, error }
 */
function ok(res, data = null, statusCode = 200, meta = undefined) {
  const body = { success: true, data, error: null };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function fail(res, statusCode, message, details = undefined) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { message, ...(details ? { details } : {}) },
  });
}

module.exports = { ok, fail };