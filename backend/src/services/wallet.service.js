'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { WALLET_TX_TYPES } = require('../config/constants');

/**
 * Get (or lazily create) a user's wallet row, with a row lock inside a txn.
 * NOTE: structure is Razorpay-ready — later, "credit" can be sourced from
 * a Razorpay payment id instead of a manual top-up.
 */
async function ensureWalletLocked(client, userId) {
  const res = await client.query(
    'SELECT id, user_id, balance_paise FROM wallets WHERE user_id = $1 FOR UPDATE',
    [userId]
  );
  if (res.rows[0]) return res.rows[0];

  const created = await client.query(
    `INSERT INTO wallets (user_id, balance_paise) VALUES ($1, 0)
     RETURNING id, user_id, balance_paise`,
    [userId]
  );
  return created.rows[0];
}

async function getMyWallet(userId) {
  const res = await db.query(
    'SELECT id, user_id, balance_paise, updated_at FROM wallets WHERE user_id = $1',
    [userId]
  );
  if (res.rows[0]) return res.rows[0];
  const created = await db.query(
    `INSERT INTO wallets (user_id, balance_paise) VALUES ($1, 0)
     RETURNING id, user_id, balance_paise, updated_at`,
    [userId]
  );
  return created.rows[0];
}

async function listTransactions(userId, limit = 50) {
  const wallet = await getMyWallet(userId);
  const res = await db.query(
    `SELECT id, type, amount_paise, note, counterparty_user_id, created_at
       FROM wallet_transactions
      WHERE wallet_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [wallet.id, limit]
  );
  return res.rows;
}

/**
 * Manual top-up (a "credit"). Razorpay can later call the same code path
 * after a successful payment webhook.
 */
async function topUp(userId, amountPaise, note) {
  return db.withTransaction(async (client) => {
    const wallet = await ensureWalletLocked(client, userId);

    await client.query(
      `INSERT INTO wallet_transactions
         (wallet_id, type, amount_paise, note)
       VALUES ($1, $2, $3, $4)`,
      [wallet.id, WALLET_TX_TYPES.CREDIT, amountPaise, note || null]
    );

    const updated = await client.query(
      `UPDATE wallets
          SET balance_paise = balance_paise + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, user_id, balance_paise, updated_at`,
      [amountPaise, wallet.id]
    );
    return updated.rows[0];
  });
}

/**
 * Transfer between two users' wallets atomically.
 * Uses row-locking on both wallet rows (sorted by user id to avoid deadlocks).
 */
async function transfer(fromUserId, toUserId, amountPaise, note) {
  if (fromUserId === toUserId) {
    throw ApiError.badRequest('Cannot transfer to yourself');
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw ApiError.badRequest('amountPaise must be a positive integer');
  }

  return db.withTransaction(async (client) => {
    // Lock both wallets in a consistent order to avoid deadlocks.
    const [idA, idB] = [fromUserId, toUserId].sort();

    // Touch both rows in sorted order to acquire locks.
    await client.query(
      'SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE',
      [idA]
    );
    await client.query(
      'SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE',
      [idB]
    );

    const fromWallet = await ensureWalletLocked(client, fromUserId);
    const toWallet = await ensureWalletLocked(client, toUserId);

    if (fromWallet.balance_paise < amountPaise) {
      throw ApiError.badRequest('Insufficient wallet balance');
    }

    await client.query(
      `INSERT INTO wallet_transactions
         (wallet_id, type, amount_paise, note, counterparty_user_id)
       VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $3, $4, $8)`,
      [
        fromWallet.id,
        WALLET_TX_TYPES.TRANSFER_OUT,
        amountPaise,
        note || null,
        toUserId,
        toWallet.id,
        WALLET_TX_TYPES.TRANSFER_IN,
        fromUserId,
      ]
    );

    await client.query(
      `UPDATE wallets SET balance_paise = balance_paise - $1, updated_at = NOW()
        WHERE id = $2`,
      [amountPaise, fromWallet.id]
    );
    const updatedTo = await client.query(
      `UPDATE wallets SET balance_paise = balance_paise + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, user_id, balance_paise, updated_at`,
      [amountPaise, toWallet.id]
    );

    return { to: updatedTo.rows[0] };
  });
}

module.exports = {
  getMyWallet,
  listTransactions,
  topUp,
  transfer,
};