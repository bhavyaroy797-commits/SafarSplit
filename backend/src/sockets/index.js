'use strict';

const { Server } = require('socket.io');
const socketAuth = require('./auth');
const db = require('../config/db');
const env = require('../config/env');

let ioRef = null;

function getIO() {
  return ioRef;
}

/**
 * Emit a Socket.io event to a trip room (no-op if the socket server isn't up).
 */
function emitToTrip(tripId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`trip:${tripId}`).emit(event, payload);
}

/**
 * Broadcast a budget alert when a new expense crosses a threshold.
 * `summary` is the object returned by budgetService.getBudgetSummary().
 */
function emitBudgetAlert(tripId, summary, triggerExpense = null) {
  if (!ioRef) return;
  ioRef.to(`trip:${tripId}`).emit('budget_alert', {
    tripId,
    alertLevel: summary.alertLevel,
    percentUsed: summary.percentUsed,
    spentPaise: summary.spentPaise,
    budgetPaise: summary.budgetPaise,
    projectedOverspendPaise: summary.projectedOverspendPaise,
    trigger: triggerExpense
      ? {
          expenseId: triggerExpense.id,
          title: triggerExpense.title,
          amountPaise: triggerExpense.amount_paise,
        }
      : null,
  });
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
    socket.join(`user:${socket.user.id}`);

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

    socket.on('disconnect', () => {});
  });

  ioRef = io;
  return io;
}

module.exports = { initSockets, getIO, emitToTrip, emitBudgetAlert };