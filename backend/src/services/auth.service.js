'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');

async function register({ name, email, password, phone, upiId }) {
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  if (existing.rows[0]) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, phone, upi_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, upi_id, created_at`,
    [name, email, passwordHash, phone || null, upiId || null]
  );

  const user = rows[0];
  const token = signAccessToken({ sub: user.id, email: user.email });
  return { user, token };
}

async function login({ email, password }) {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, upi_id, password_hash
       FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const okPass = await bcrypt.compare(password, user.password_hash);
  if (!okPass) throw ApiError.unauthorized('Invalid email or password');

  delete user.password_hash;
  const token = signAccessToken({ sub: user.id, email: user.email });
  return { user, token };
}

async function getMe(userId) {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, upi_id, created_at
       FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  return rows[0];
}

async function updateMe(userId, patch) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    name: 'name',
    phone: 'phone',
    upiId: 'upi_id',
  };

  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(patch[key]);
    }
  }

  if (fields.length === 0) return getMe(userId);

  values.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING id, name, email, phone, upi_id, created_at`,
    values
  );
  return rows[0];
}

module.exports = { register, login, getMe, updateMe };