'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Zod validator middleware.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    // Overwrite with parsed (and coerced) values.
    req[source] = result.data;
    next();
  };
}

module.exports = validate;