'use strict';

const { Server } = require('socket.io');
const socketAuth = require('./auth');
const db = require('../config/db');
const env = require('../config/env');

let ioRef = null;

function getIO() {
  return ioRef;
}

function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    // Personal room so we can push user-scoped events later.
    socket.join(`user:${socket.user.id}`);

    /**
     * Client emits: socket.emit('trip:join', { tripId })
     * We verify membership server-side before joining the room.
     */
    socket.on('trip:join', async ({ tripId } = {}, ack) => {
      try {
        if (!tripId) throw new Error('tripId required');

        const { rows } = await db.query(
          `SELECT role FROM trip_members
            WHERE trip_id = $1 AND user_id = $2 LIMIT 1`,
          [tripId, socket.user.id]
        );
        if (!rows[0]) {
          if (typeof ack === 'function') ack({ ok: false, error: 'NOT_A_MEMBER' });
          return;
        }

        socket.join(`trip:${tripId}`);
        if (typeof ack === 'function') ack({ ok: true, role: rows[0].role });

        // Notify others that someone came online (light presence).
        socket.to(`trip:${tripId}`).emit('presence:online', {
          userId: socket.user.id,
          name: socket.user.name,
        });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('trip:leave', ({ tripId } = {}, ack) => {
      if (tripId) {
        socket.leave(`trip:${tripId}`);
        socket.to(`trip:${tripId}`).emit('presence:offline', {
          userId: socket.user.id,
          name: socket.user.name,
        });
      }
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', () => {
      // Presence cleanup is handled implicitly by socket.io room state.
    });
  });

  ioRef = io;
  return io;
}

module.exports = { initSockets, getIO };