'use strict';

const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { fail } = require('../utils/ApiResponse');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const isProd = env.NODE_ENV === 'production';

  // Postgres unique violation
  if (err.code === '23505') {
    return fail(res, 409, 'Resource already exists', isProd ? undefined : err.detail);
  }
  // Postgres FK violation
  if (err.code === '23503') {
    return fail(res, 400, 'Referenced resource does not exist');
  }

  if (err instanceof ApiError) {
    return fail(res, err.statusCode, err.message, err.details);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 400, `File too large (max ${env.MAX_UPLOAD_MB} MB)`);
  }

  console.error('[error]', err);

  if (isProd) return fail(res, 500, 'Internal server error');
  return fail(res, 500, err.message || 'Internal server error', {
    stack: err.stack,
  });
}

module.exports = errorHandler;