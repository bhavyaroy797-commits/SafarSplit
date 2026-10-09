'use strict';

const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

/**
 * Socket.io handshake middleware.
 * Client must send `auth: { token: '<JWT>' }` in the connection options.
 * On success, attaches `socket.user = { id, email, name }`.
 */
async function socketAuth(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return next(new Error('AUTH_MISSING'));

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (_) {
      return next(new Error('AUTH_INVALID'));
    }

    const { rows } = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1 LIMIT 1',
      [decoded.sub]
    );
    if (!rows[0]) return next(new Error('AUTH_USER_GONE'));

    socket.user = rows[0];
    return next();
  } catch (err) {
    return next(new Error('AUTH_FAILED'));
  }
}

module.exports = socketAuth;