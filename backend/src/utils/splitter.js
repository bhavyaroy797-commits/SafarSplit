'use strict';

const { assertPaise } = require('./money');
const { SPLIT_TYPES } = require('../config/constants');

/**
 * Distribute `total` (paise) across N buckets as evenly as possible,
 * giving the remainder to the FIRST `remainder` buckets.
 *
 * Example: total=100, n=3 -> [34, 33, 33]
 * Always sums exactly to `total`.
 */
function distributeRemainder(total, n) {
  assertPaise(total);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('n must be a positive integer');
  }
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const out = new Array(n).fill(base);
  for (let i = 0; i < remainder; i++) out[i] += 1;
  return out;
}

/**
 * EQUAL split with per-member inclusions.
 * @param {number} totalPaise
 * @param {string[]} includedUserIds
 * @returns {Map<string, number>} userId -> paise
 */
function splitEqual(totalPaise, includedUserIds) {
  assertPaise(totalPaise);
  if (!Array.isArray(includedUserIds) || includedUserIds.length === 0) {
    throw new Error('splitEqual: at least one included member required');
  }
  const uniq = [...new Set(includedUserIds)];
  const shares = distributeRemainder(totalPaise, uniq.length);
  const map = new Map();
  uniq.forEach((id, i) => map.set(id, shares[i]));
  return map;
}

/**
 * EXACT amounts. Caller must ensure sum === total.
 */
function splitExact(totalPaise, entries) {
  assertPaise(totalPaise);
  const map = new Map();
  let sum = 0;
  for (const { userId, amountPaise } of entries) {
    assertPaise(amountPaise, `amount for ${userId}`);
    if (map.has(userId)) throw new Error(`Duplicate user in exact split: ${userId}`);
    map.set(userId, amountPaise);
    sum += amountPaise;
  }
  if (sum !== totalPaise) {
    throw new Error(`Exact split sum ${sum} != total ${totalPaise}`);
  }
  return map;
}

/**
 * PERCENT split. Percents must sum to 100 (small float tolerance).
 * Rounding remainder goes to the largest-share members to guarantee exact sum.
 */
function splitPercent(totalPaise, entries) {
  assertPaise(totalPaise);
  const totalPct = entries.reduce((s, e) => s + Number(e.percent), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percent split must sum to 100, got ${totalPct}`);
  }
  const raw = entries.map((e) => ({
    userId: e.userId,
    exact: (Number(e.percent) / 100) * totalPaise,
  }));
  const floored = raw.map((r) => ({
    userId: r.userId,
    paise: Math.floor(r.exact),
    frac: r.exact - Math.floor(r.exact),
  }));
  const sumFloored = floored.reduce((s, f) => s + f.paise, 0);
  const remainder = totalPaise - sumFloored;

  const order = [...floored].sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) order[i % order.length].paise += 1;

  const map = new Map();
  for (const f of floored) map.set(f.userId, f.paise);
  return map;
}

/**
 * SHARES split. Each member has a numeric weight.
 * Result is proportional; remainder distributed by fractional part.
 */
function splitShares(totalPaise, entries) {
  assertPaise(totalPaise);
  const totalShares = entries.reduce((s, e) => s + Number(e.shares), 0);
  if (totalShares <= 0) throw new Error('Shares must be > 0');
  const raw = entries.map((e) => ({
    userId: e.userId,
    exact: (Number(e.shares) / totalShares) * totalPaise,
  }));
  const floored = raw.map((r) => ({
    userId: r.userId,
    paise: Math.floor(r.exact),
    frac: r.exact - Math.floor(r.exact),
  }));
  const sumFloored = floored.reduce((s, f) => s + f.paise, 0);
  const remainder = totalPaise - sumFloored;
  const order = [...floored].sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) order[i % order.length].paise += 1;

  const map = new Map();
  for (const f of floored) map.set(f.userId, f.paise);
  return map;
}

/**
 * Top-level dispatcher.
 * @param {number} totalPaise
 * @param {'equal'|'exact'|'percent'|'shares'} type
 * @param {object} payload
 * @returns {Map<string, number>}
 */
function computeSplits(totalPaise, type, payload) {
  assertPaise(totalPaise);
  switch (type) {
    case SPLIT_TYPES.EQUAL:
      return splitEqual(totalPaise, payload.includedUserIds);
    case SPLIT_TYPES.EXACT:
      return splitExact(totalPaise, payload.entries);
    case SPLIT_TYPES.PERCENT:
      return splitPercent(totalPaise, payload.entries);
    case SPLIT_TYPES.SHARES:
      return splitShares(totalPaise, payload.entries);
    default:
      throw new Error(`Unknown split type: ${type}`);
  }
}

module.exports = {
  distributeRemainder,
  splitEqual,
  splitExact,
  splitPercent,
  splitShares,
  computeSplits,
};