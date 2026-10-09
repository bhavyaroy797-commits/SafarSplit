'use strict';

const crypto = require('crypto');

// Exclude ambiguous chars (0/O, 1/I/L) so codes are easy to share verbally.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateJoinCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

module.exports = { generateJoinCode };