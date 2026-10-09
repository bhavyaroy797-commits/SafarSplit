'use strict';

const { paiseToRupees } = require('./money');

/**
 * Build a UPI deep link.
 * Format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 */
function buildUpiLink({ upiId, payeeName, amountPaise, note }) {
  if (!upiId || typeof upiId !== 'string') {
    throw new Error('Receiver UPI ID is required to build a UPI link');
  }
  const amt = paiseToRupees(amountPaise).toFixed(2);
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || 'SafarSplit',
    am: amt,
    cu: 'INR',
    tn: (note || 'SafarSplit settle-up').slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

module.exports = { buildUpiLink };