'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { computeSplits } = require('../utils/splitter');
const { computeSettleUp } = require('../utils/settleUp');
const { buildUpiLink } = require('../utils/upi');
const { SPLIT_TYPES } = require('../config/constants');

/**
 * Create an expense + its splits atomically.
 * Splits always sum exactly to amountPaise (splitter guarantees this).
 */
async function createExpense(tripId, userId, payload) {
  return db.withTransaction(async (client) => {
    const paidByUserId = payload.paidByUserId || userId;

    // Validate that payer and all participants are members of the trip.
    const memberIdsRes = await client.query(
      'SELECT user_id FROM trip_members WHERE trip_id = $1',
      [tripId]
    );
    const memberIds = new Set(memberIdsRes.rows.map((r) => r.user_id));

    if (!memberIds.has(paidByUserId)) {
      throw ApiError.badRequest('Payer is not a member of this trip');
    }

    const splitMap = buildSplitMap(payload);

    for (const splitUserId of splitMap.keys()) {
      if (!memberIds.has(splitUserId)) {
        throw ApiError.badRequest(`User ${splitUserId} is not a trip member`);
      }
    }

    // Sanity: splits sum exactly to total.
    const sumSplits = [...splitMap.values()].reduce((s, v) => s + v, 0);
    if (sumSplits !== payload.amountPaise) {
      throw ApiError.internal(
        `Split sum ${sumSplits} != total ${payload.amountPaise}`
      );
    }

    const { rows } = await client.query(
      `INSERT INTO expenses
         (trip_id, title, amount_paise, paid_by_user_id, split_type,
          category, notes, spent_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, NOW()),$9)
       RETURNING *`,
      [
        tripId,
        payload.title,
        payload.amountPaise,
        paidByUserId,
        payload.splitType,
        payload.category || null,
        payload.notes || null,
        payload.spentAt || null,
        userId,
      ]
    );
    const expense = rows[0];

    // Bulk insert splits.
    const values = [];
    const params = [];
    let i = 1;
    for (const [uid, amt] of splitMap.entries()) {
      values.push(`($${i++}, $${i++}, $${i++})`);
      params.push(expense.id, uid, amt);
    }
    if (values.length > 0) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_paise)
         VALUES ${values.join(', ')}`,
        params
      );
    }

    return { expense, splits: Object.fromEntries(splitMap) };
  });
}

function buildSplitMap(payload) {
  switch (payload.splitType) {
    case SPLIT_TYPES.EQUAL:
      return computeSplits(payload.amountPaise, SPLIT_TYPES.EQUAL, {
        includedUserIds: payload.includedUserIds,
      });
    case SPLIT_TYPES.EXACT:
      return computeSplits(payload.amountPaise, SPLIT_TYPES.EXACT, {
        entries: payload.entries.map((e) => ({
          userId: e.userId,
          amountPaise: e.amountPaise,
        })),
      });
    case SPLIT_TYPES.PERCENT:
      return computeSplits(payload.amountPaise, SPLIT_TYPES.PERCENT, {
        entries: payload.entries.map((e) => ({
          userId: e.userId,
          percent: e.percent,
        })),
      });
    case SPLIT_TYPES.SHARES:
      return computeSplits(payload.amountPaise, SPLIT_TYPES.SHARES, {
        entries: payload.entries.map((e) => ({
          userId: e.userId,
          shares: e.shares,
        })),
      });
    default:
      throw ApiError.badRequest(`Unknown split type: ${payload.splitType}`);
  }
}

async function listExpenses(tripId) {
  const expensesRes = await db.query(
    `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by_user_id
      WHERE e.trip_id = $1
      ORDER BY e.spent_at DESC, e.created_at DESC`,
    [tripId]
  );
  const expenses = expensesRes.rows;
  if (expenses.length === 0) return [];

  const ids = expenses.map((e) => e.id);
  const splitsRes = await db.query(
    `SELECT expense_id, user_id, amount_paise
       FROM expense_splits
      WHERE expense_id = ANY($1::uuid[])`,
    [ids]
  );

  const byExpense = new Map();
  for (const s of splitsRes.rows) {
    if (!byExpense.has(s.expense_id)) byExpense.set(s.expense_id, []);
    byExpense.get(s.expense_id).push({
      userId: s.user_id,
      amountPaise: s.amount_paise,
    });
  }

  return expenses.map((e) => ({
    ...e,
    splits: byExpense.get(e.id) || [],
  }));
}

async function getExpense(expenseId) {
  const { rows } = await db.query(
    `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by_user_id
      WHERE e.id = $1 LIMIT 1`,
    [expenseId]
  );
  if (!rows[0]) throw ApiError.notFound('Expense not found');
  const splits = await db.query(
    `SELECT user_id, amount_paise FROM expense_splits WHERE expense_id = $1`,
    [expenseId]
  );
  return { ...rows[0], splits: splits.rows };
}

async function deleteExpense(expenseId) {
  const { rowCount } = await db.query('DELETE FROM expenses WHERE id = $1', [
    expenseId,
  ]);
  if (rowCount === 0) throw ApiError.notFound('Expense not found');
}

/**
 * Compute per-member net balances for a trip.
 *
 * For each expense:
 *   payer gets +amountPaise
 *   each split contributes -amountPaise to that user
 * Net > 0  => is owed money (creditor)
 * Net < 0  => owes money    (debtor)
 */
async function computeBalances(tripId) {
  const expensesRes = await db.query(
    `SELECT id, amount_paise, paid_by_user_id FROM expenses WHERE trip_id = $1`,
    [tripId]
  );
  const expenses = expensesRes.rows;

  const balances = new Map();
  const bump = (uid, delta) =>
    balances.set(uid, (balances.get(uid) || 0) + delta);

  if (expenses.length === 0) return balances;

  const ids = expenses.map((e) => e.id);
  const splitsRes = await db.query(
    `SELECT expense_id, user_id, amount_paise
       FROM expense_splits WHERE expense_id = ANY($1::uuid[])`,
    [ids]
  );

  const splitsByExpense = new Map();
  for (const s of splitsRes.rows) {
    if (!splitsByExpense.has(s.expense_id)) splitsByExpense.set(s.expense_id, []);
    splitsByExpense.get(s.expense_id).push(s);
  }

  for (const e of expenses) {
    bump(e.paid_by_user_id, e.amount_paise);
    for (const s of splitsByExpense.get(e.id) || []) {
      bump(s.user_id, -s.amount_paise);
    }
  }

  return balances;
}

/**
 * Minimum-transaction settle-up list, with UPI deep links.
 * Each transfer includes the receiver's upi_id (if set) and a ready-to-use link.
 */
async function getSettleUp(tripId) {
  const balances = await computeBalances(tripId);
  const transfers = computeSettleUp(balances);

  const userIds = new Set();
  for (const t of transfers) {
    userIds.add(t.fromUserId);
    userIds.add(t.toUserId);
  }

  let usersById = new Map();
  if (userIds.size > 0) {
    const usersRes = await db.query(
      `SELECT id, name, upi_id FROM users WHERE id = ANY($1::uuid[])`,
      [[...userIds]]
    );
    usersById = new Map(usersRes.rows.map((u) => [u.id, u]));
  }

  const enriched = transfers.map((t) => {
    const from = usersById.get(t.fromUserId) || {};
    const to = usersById.get(t.toUserId) || {};
    let upiLink = null;
    if (to.upi_id) {
      upiLink = buildUpiLink({
        upiId: to.upi_id,
        payeeName: to.name,
        amountPaise: t.amountPaise,
        note: `SafarSplit settle-up`,
      });
    }
    return {
      fromUserId: t.fromUserId,
      fromName: from.name || null,
      toUserId: t.toUserId,
      toName: to.name || null,
      toUpiId: to.upi_id || null,
      amountPaise: t.amountPaise,
      upiLink,
    };
  });

  const balanceList = [...balances.entries()].map(([userId, amountPaise]) => ({
    userId,
    amountPaise,
  }));

  return { balances: balanceList, transfers: enriched };
}

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  deleteExpense,
  computeBalances,
  getSettleUp,
};