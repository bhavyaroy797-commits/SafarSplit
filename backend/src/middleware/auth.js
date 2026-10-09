'use strict';

const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const db = require('../config/db');

/**
 * Verifies JWT and attaches req.user = { id, email, name }.
 */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (_) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const { rows } = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1 LIMIT 1',
      [decoded.sub]
    );
    if (!rows[0]) throw ApiError.unauthorized('User no longer exists');

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures the authenticated user is a member (owner or member) of :tripId.
 * Attaches req.tripMember = { tripId, role }.
 */
async function requireTripMember(req, _res, next) {
  try {
    const tripId =
      req.params.tripId || req.params.id || req.body.tripId || req.query.tripId;
    if (!tripId) throw ApiError.badRequest('tripId is required');

    const { rows } = await db.query(
      `SELECT trip_id, user_id, role
         FROM trip_members
        WHERE trip_id = $1 AND user_id = $2
        LIMIT 1`,
      [tripId, req.user.id]
    );
    if (!rows[0]) throw ApiError.forbidden('You are not a member of this trip');

    req.tripMember = { tripId: rows[0].trip_id, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures req.tripMember.role === 'owner'. Run AFTER requireTripMember.
 */
function requireTripOwner(req, _res, next) {
  if (!req.tripMember || req.tripMember.role !== 'owner') {
    return next(ApiError.forbidden('Only the trip owner can do this'));
  }
  next();
}

module.exports = { requireAuth, requireTripMember, requireTripOwner };