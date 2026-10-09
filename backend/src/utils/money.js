'use strict';

/**
 * Money helpers. All amounts in this codebase are INTEGER PAISE.
 * 1 INR = 100 paise. Never use floats for money.
 */

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function assertPaise(n, label = 'amount') {
  if (!Number.isInteger(n)) {
    throw new Error(`${label} must be an integer (paise), got ${n}`);
  }
  if (n < 0) throw new Error(`${label} cannot be negative`);
  if (n > MAX_SAFE) throw new Error(`${label} exceeds safe range`);
  return n;
}

const rupeesToPaise = (rupees) => {
  const r = Number(rupees);
  if (!Number.isFinite(r)) throw new Error('Invalid rupees value');
  // Round to nearest paise to kill float artifacts like 0.1 + 0.2.
  return Math.round(r * 100);
};

const paiseToRupees = (paise) => {
  assertPaise(paise);
  return paise / 100;
};

const formatINR = (paise) => {
  assertPaise(paise);
  return `₹${(paise / 100).toFixed(2)}`;
};

module.exports = {
  assertPaise,
  rupeesToPaise,
  paiseToRupees,
  formatINR,
};