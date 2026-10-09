'use strict';

require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[env] Missing required variable: ${key}`);
    process.exit(1);
  }
}

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const toList = (v, d = []) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d;

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toInt(process.env.PORT, 5000),

  DATABASE_URL: process.env.DATABASE_URL,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: toInt(process.env.BCRYPT_ROUNDS, 10),

  CORS_ORIGIN: toList(process.env.CORS_ORIGIN, ['http://localhost:5173']),

  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_UPLOAD_MB: toInt(process.env.MAX_UPLOAD_MB, 10),

  // ---------- AI ----------
  // AI_PROVIDER: 'ollama' | 'openai-compatible'
  AI_PROVIDER: process.env.AI_PROVIDER || 'ollama',
  // Unified model name (falls back to MODEL_NAME for backward compat)
  AI_MODEL: process.env.AI_MODEL || process.env.MODEL_NAME || 'gemma2:9b',
  AI_TIMEOUT_MS: toInt(process.env.AI_TIMEOUT_MS, 60000),
  AI_MAX_RETRIES: toInt(process.env.AI_MAX_RETRIES, 1),

  // Ollama (used when AI_PROVIDER=ollama)
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  MODEL_NAME: process.env.MODEL_NAME || 'gemma2:9b', // legacy, still read

  // OpenAI-compatible (used when AI_PROVIDER=openai-compatible)
  // Works with: DeepSeek, DigitalOcean GenAI, Groq, Together, OpenRouter,
  // Fireworks, vLLM, LM Studio, and any other /v1/chat/completions endpoint.
  AI_API_URL: process.env.AI_API_URL || '',
  AI_API_KEY: process.env.AI_API_KEY || '',

  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',

  RATE_LIMIT_WINDOW_MS: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: toInt(process.env.RATE_LIMIT_MAX, 300),
  AUTH_RATE_LIMIT_MAX: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  AI_RATE_LIMIT_MAX: toInt(process.env.AI_RATE_LIMIT_MAX, 30),

  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'INR',
};