'use strict';

/**
 * Minimum settle-up algorithm.
 *
 * Input:  balances = Map<userId, netPaise>
 *         positive => is owed money (creditor)
 *         negative => owes money   (debtor)
 * Output: array of { fromUserId, toUserId, amountPaise }
 *
 * Greedy match largest creditor with largest debtor.
 * Produces at most (n - 1) transactions for n members.
 */
function computeSettleUp(balances) {
  const creditors = [];
  const debtors = [];

  for (const [userId, bal] of balances.entries()) {
    if (bal > 0) creditors.push({ userId, amount: bal });
    else if (bal < 0) debtors.push({ userId, amount: -bal });
  }

  // Largest first — minimizes number of transactions.
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.amount, c.amount);

    if (pay > 0) {
      transfers.push({
        fromUserId: d.userId,
        toUserId: c.userId,
        amountPaise: pay,
      });
    }

    d.amount -= pay;
    c.amount -= pay;

    if (d.amount === 0) i++;
    if (c.amount === 0) j++;
  }

  return transfers;
}

module.exports = { computeSettleUp };