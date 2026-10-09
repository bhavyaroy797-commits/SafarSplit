'use strict';

const fetch = global.fetch;
const fs = require('fs');
const env = require('../config/env');
const db = require('../config/db');
const { extractJson } = require('../utils/aiJson');
const { AI_FEATURES, AI_STATUS } = require('../config/constants');

const VISION_MODEL = process.env.VISION_MODEL_NAME || 'gemma3:4b';

async function readReceipt({ tripId, userId, imagePath, mimeType }) {
  const started = Date.now();
  const base64 = fs.readFileSync(imagePath).toString('base64');

  const system =
    'You are a precise OCR + receipt parser for Indian restaurant bills. ' +
    'Reply with strict JSON only. No prose, no markdown fences.';

  const userPrompt = `
Extract the bill into this exact JSON shape:
{
  "merchant": string|null,
  "date": "YYYY-MM-DD"|null,
  "items": [
    { "name": string, "qty": number, "unit_price_inr": number, "line_total_inr": number, "confidence": number }
  ],
  "subtotal_inr": number|null,
  "taxes": [ { "label": string, "amount_inr": number } ],
  "service_charge_inr": number,
  "discount_inr": number,
  "delivery_inr": number,
  "total_inr": number,
  "currency": "INR"
}
Rules:
- All money values in RUPEES as numbers (we convert to paise later).
- qty must be >= 1.
- Only include items that are line items on the bill.
- Sum of items + taxes + service_charge + delivery - discount should equal total. If it doesn't, still return the true numbers; we flag mismatches in code.
`.trim();

  let parsed = null;
  let raw = '';
  let status = AI_STATUS.SUCCESS;
  let errorMessage = null;
  let usedModel = `vision:${VISION_MODEL}`;

  try {
    const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        stream: false,
        format: 'json',
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt, images: [base64] },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Ollama vision HTTP ${res.status}: ${t.slice(0, 160)}`);
    }
    const json = await res.json();
    raw = json.message?.content || json.response || '';
    parsed = extractJson(raw);
  } catch (err) {
    status = AI_STATUS.ERROR;
    errorMessage = err.message;

    try {
      const fallback = await fallbackOCR({ imagePath });
      raw = fallback.raw;
      parsed = fallback.parsed;
      usedModel = `fallback:${fallback.model}`;
      status = AI_STATUS.SUCCESS;
      errorMessage = null;
    } catch (e2) {
      parsed = {
        merchant: null,
        date: null,
        items: [],
        subtotal_inr: null,
        taxes: [],
        service_charge_inr: 0,
        discount_inr: 0,
        delivery_inr: 0,
        total_inr: null,
        currency: 'INR',
      };
      errorMessage = `vision failed: ${errorMessage}; fallback failed: ${e2.message}`;
      status = AI_STATUS.ERROR;
    }
  } finally {
    const latencyMs = Date.now() - started;
    db.query(
      `INSERT INTO ai_requests
         (trip_id, user_id, feature, model, prompt, response,
          latency_ms, status, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        tripId || null,
        userId || null,
        AI_FEATURES.READ_RECEIPT,
        usedModel,
        userPrompt.slice(0, 2000),
        (raw || '').slice(0, 8000),
        latencyMs,
        status,
        errorMessage,
      ]
    ).catch((e) => console.error('[ai_requests] insert failed', e));
  }

  return normalizeVisionResult(parsed);
}

async function fallbackOCR({ imagePath }) {
  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch {
    throw new Error('tesseract.js not installed');
  }
  const { data } = await Tesseract.recognize(imagePath, 'eng');
  const text = (data?.text || '').trim();
  if (!text) throw new Error('OCR returned no text');

  const model = process.env.MODEL_NAME || 'gemma2:9b';
  const prompt = `
You are parsing OCR text from an Indian restaurant bill. Reply with strict JSON only.
OCR:
"""
${text}
"""
Return:
{
  "merchant": string|null,
  "date": "YYYY-MM-DD"|null,
  "items": [{ "name": string, "qty": number, "unit_price_inr": number, "line_total_inr": number, "confidence": number }],
  "subtotal_inr": number|null,
  "taxes": [{ "label": string, "amount_inr": number }],
  "service_charge_inr": number,
  "discount_inr": number,
  "delivery_inr": number,
  "total_inr": number
}
`.trim();

  const res = await fetch(`${env.OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama text HTTP ${res.status}`);
  const json = await res.json();
  const raw = json.response || '';
  const parsed = extractJson(raw);
  return { raw, parsed, model: `text:${model}` };
}

function normalizeVisionResult(p) {
  const toPaise = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  };

  const items = Array.isArray(p.items)
    ? p.items
        .map((it) => {
          const qty = Number.isFinite(Number(it.qty)) && Number(it.qty) > 0 ? Number(it.qty) : 1;
          const unit = toPaise(it.unit_price_inr);
          const line = it.line_total_inr != null ? toPaise(it.line_total_inr) : Math.round(unit * qty);
          return {
            name: String(it.name || '').trim() || 'Item',
            qty,
            unitPricePaise: unit || Math.round(line / qty),
            lineTotalPaise: line,
            confidence:
              typeof it.confidence === 'number' ? Math.min(1, Math.max(0, it.confidence)) : 0.8,
          };
        })
        .filter((it) => it.name && it.lineTotalPaise >= 0)
    : [];

  const taxesPaise = Array.isArray(p.taxes)
    ? p.taxes.reduce((s, t) => s + toPaise(t.amount_inr), 0)
    : 0;

  const serviceChargePaise = toPaise(p.service_charge_inr);
  const discountPaise = toPaise(p.discount_inr);
  const deliveryPaise = toPaise(p.delivery_inr);
  const totalPaise = toPaise(p.total_inr);

  const itemsSum = items.reduce((s, it) => s + it.lineTotalPaise, 0);
  const computed = itemsSum + taxesPaise + serviceChargePaise + deliveryPaise - discountPaise;
  const mismatch = totalPaise > 0 && Math.abs(computed - totalPaise) > 100;

  return {
    merchant: p.merchant ? String(p.merchant).trim() : null,
    date: typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : null,
    items,
    subtotalPaise: p.subtotal_inr != null ? toPaise(p.subtotal_inr) : itemsSum,
    taxesPaise,
    serviceChargePaise,
    discountPaise,
    deliveryPaise,
    totalPaise: totalPaise || computed,
    mismatch,
    mismatchNote: mismatch
      ? `Items+taxes+service+delivery-discount (₹${(computed / 100).toFixed(2)}) ≠ printed total (₹${(totalPaise / 100).toFixed(2)}).`
      : null,
  };
}

module.exports = { readReceipt };