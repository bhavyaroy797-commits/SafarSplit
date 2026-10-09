'use strict';

const { fail } = require('../utils/ApiResponse');

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = notFound;