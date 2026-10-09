'use strict';

const fetch = global.fetch; // Node 18+
const db = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { extractJson } = require('../utils/aiJson');
const { AI_FEATURES, AI_STATUS } = require('../config/constants');

/* ------------------------------------------------------------------ */
/* Provider: Ollama (local, open-weight models, offline-capable)      */
/* ------------------------------------------------------------------ */

async function callOllama({ prompt, system, model }) {
  const body = {
    model,
    prompt,
    system,
    stream: false,
    format: 'json', // forces JSON-mode on supported models
    options: { temperature: 0.4 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    return json.response || '';
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Provider: OpenAI-compatible (DeepSeek, DigitalOcean, Groq,          */
/* Together, OpenRouter, Fireworks, vLLM, LM Studio, etc.)             */
/* ------------------------------------------------------------------ */

async function callOpenAICompatible({ prompt, system, model }) {
  if (!env.AI_API_URL) {
    throw new Error('AI_API_URL is required for openai-compatible provider');
  }
  if (!env.AI_API_KEY) {
    throw new Error('AI_API_KEY is required for openai-compatible provider');
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    // Force JSON where supported (OpenAI, DeepSeek, Groq, Together all honor this).
    response_format: { type: 'json_object' },
    stream: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.AI_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content =
      json.choices?.[0]?.message?.content ??
      json.choices?.[0]?.text ??
      '';
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Unified LLM call: logs to ai_requests, no matter the provider       */
/* ------------------------------------------------------------------ */

const DEFAULT_SYSTEM =
  'You are SafarSplit AI, a travel planning assistant for Indian group trips. ' +
  'Always reply with strict JSON only. No prose. No markdown fences.';

async function callLLM({ prompt, system, tripId, userId, feature, expectArray = false }) {
  const started = Date.now();
  const model = env.AI_MODEL || env.MODEL_NAME || 'gemma2:9b';
  const provider = env.AI_PROVIDER;

  let raw = '';
  let status = AI_STATUS.SUCCESS;
  let errorMessage = null;
  let parsed = null;

  try {
    const args = { prompt, system: system || DEFAULT_SYSTEM, model };

    if (provider === 'ollama') {
      raw = await callOllama(args);
    } else if (provider === 'openai-compatible') {
      raw = await callOpenAICompatible(args);
    } else {
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
    }

    parsed = extractJson(raw);
    if (expectArray && !Array.isArray(parsed)) {
      throw new Error('Expected a JSON array');
    }
  } catch (err) {
    status = AI_STATUS.ERROR;
    errorMessage = err.message;
  } finally {
    const latencyMs = Date.now() - started;
    // Fire-and-forget; logging failure must never break the request.
    db.query(
      `INSERT INTO ai_requests
         (trip_id, user_id, feature, model, prompt, response,
          latency_ms, status, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        tripId || null,
        userId || null,
        feature,
        `${provider}:${model}`,
        prompt.slice(0, 8000),
        (raw || '').slice(0, 8000),
        latencyMs,
        status,
        errorMessage,
      ]
    ).catch((e) => console.error('[ai_requests] insert failed', e));
  }

  if (status === AI_STATUS.ERROR) {
    throw ApiError.internal(`AI service failed: ${errorMessage}`);
  }

  return { parsed, raw, latencyMs: Date.now() - started };
}

/**
 * Retry wrapper: if JSON parsing failed, retry once with a stricter reminder.
 */
async function callLLMWithRetry(args) {
  try {
    return await callLLM(args);
  } catch (err) {
    if (env.AI_MAX_RETRIES <= 0) throw err;
    const reminder =
      '\n\nIMPORTANT: Your previous reply was not valid JSON. ' +
      'Reply with ONLY a single valid JSON object (or array), no prose, no fences.';
    return callLLM({ ...args, prompt: args.prompt + reminder });
  }
}

/* ------------------------------------------------------------------ */
/* Optional OSRM travel-time enrichment (unchanged)                    */
/* ------------------------------------------------------------------ */

async function fetchTravelTimes(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${env.OSRM_URL}/route/v1/driving/${path}?overview=false&steps=false`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.routes?.[0]?.legs) return null;
    return json.routes[0].legs.map((leg) => ({
      distanceKm: +(leg.distance / 1000).toFixed(2),
      durationMin: Math.round(leg.duration / 60),
    }));
  } catch (err) {
    console.error('[osrm] fetch failed', err.message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature: Generate itinerary                                         */
/* ------------------------------------------------------------------ */

async function generateItinerary({ tripId, userId, params }) {
  const {
    destination,
    days,
    groupSize,
    budgetPerPersonPaise,
    interests,
    foodPreference,
    notes,
  } = params;

  const budgetInr = budgetPerPersonPaise
    ? Math.round(budgetPerPersonPaise / 100)
    : null;

  const prompt = `
Plan a ${days}-day trip to ${destination} for a group of ${groupSize} people from India.
${budgetInr ? `Budget per person: about ₹${budgetInr} total.` : ''}
Interests: ${interests.join(', ') || 'general sightseeing, food, culture'}.
Food preference: ${foodPreference}.
${notes ? `Extra notes: ${notes}` : ''}

Return ONLY this JSON shape:
{
  "destination": string,
  "summary": string,
  "days": [
    {
      "dayNumber": number,
      "theme": string,
      "items": [
        {
          "title": string,
          "place": string,
          "startTime": "HH:MM",
          "costEstimateInr": number,
          "notes": string
        }
      ]
    }
  ],
  "tips": [string]
}
All costs in INR (integers). Keep each day to 3-5 items. Respect food preference strictly.
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt,
    tripId,
    userId,
    feature: AI_FEATURES.GENERATE_ITINERARY,
  });
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Feature: Re-plan (only affected days)                               */
/* ------------------------------------------------------------------ */

async function replan({ tripId, userId, params, existingItems }) {
  const { reason, affectedDayNumbers } = params;

  const context = existingItems
    .filter((i) => affectedDayNumbers.includes(i.day_number))
    .map((i) => ({
      day: i.day_number,
      title: i.title,
      place: i.place,
      startTime: i.start_time,
      costInr: i.cost_estimate_paise ? Math.round(i.cost_estimate_paise / 100) : 0,
      notes: i.notes,
    }));

  const prompt = `
You are re-planning ONLY certain days of an existing trip.
Reason for change: ${reason}
Affected day numbers: ${affectedDayNumbers.join(', ')}

Existing plan for those days (JSON):
${JSON.stringify(context, null, 2)}

Rewrite ONLY the affected days. Keep the same JSON shape per day:
{
  "days": [
    {
      "dayNumber": number,
      "theme": string,
      "items": [
        { "title": string, "place": string, "startTime": "HH:MM",
          "costEstimateInr": number, "notes": string }
      ]
    }
  ],
  "explanation": string
}
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt,
    tripId,
    userId,
    feature: AI_FEATURES.REPLAN,
  });
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Feature: Parse expense text -> structured split                     */
/* ------------------------------------------------------------------ */

async function parseExpenseText({ tripId, userId, text, members }) {
  const memberList = members.map((m) => ({ id: m.user_id, name: m.name }));

  const prompt = `
You are an expense parser for an Indian group trip app.
Understand English AND Hinglish (Roman Hindi). Examples:
- "Rahul ne 1200 diye dinner ke liye, Amit ko chhod ke 4 mein split"
  => payer: Rahul, amount 1200, split equally among ALL members EXCEPT Amit.
- "Priya paid 500 for cab, split 60/40 between Priya and Neha"
  => payer Priya, exact percent split 60/40.

Trip members (use these exact ids):
${JSON.stringify(memberList)}

Input text: """${text}"""

Return ONLY this JSON:
{
  "title": string,
  "amountInr": number,
  "paidByName": string,
  "splitType": "equal" | "exact" | "percent" | "shares",
  "excludedNames": [string],
  "includedNames": [string],
  "entries": [
    { "name": string, "amountInr": number, "percent": number, "shares": number }
  ],
  "needs_clarification": boolean,
  "clarification_question": string | null,
  "unknown_names": [string]
}
Rules:
- If any name in the text does not match a trip member exactly, put it in "unknown_names" and set needs_clarification=true.
- If a name matches multiple members (same first name), set needs_clarification=true.
- amountInr must be a number, not a string.
- For "equal" split, populate includedNames / excludedNames.
- For other split types, populate entries with the right field(s).
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt,
    tripId,
    userId,
    feature: AI_FEATURES.PARSE_EXPENSE,
  });

  // Reconcile names -> ids locally (don't trust the LLM blindly).
  const byName = new Map();
  for (const m of members) {
    const key = m.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(m);
  }

  const ambiguous = [];
  const unknown = [];

  const resolveName = (name) => {
    if (!name || typeof name !== 'string') return null;
    const key = name.trim().toLowerCase();
    const matches = byName.get(key) || [];
    if (matches.length === 0) {
      const partial = [...byName.entries()].filter(([k]) =>
        k.startsWith(key.split(' ')[0])
      );
      if (partial.length === 1) return partial[0][1][0];
      if (partial.length > 1) {
        ambiguous.push(name);
        return null;
      }
      unknown.push(name);
      return null;
    }
    if (matches.length > 1) {
      ambiguous.push(name);
      return null;
    }
    return matches[0];
  };

  const result = {
    title: parsed.title || 'Expense',
    amountPaise: Number.isFinite(parsed.amountInr)
      ? Math.round(parsed.amountInr * 100)
      : null,
    paidByUserId: null,
    paidByName: parsed.paidByName || null,
    splitType: parsed.splitType || 'equal',
    includedUserIds: [],
    excludedUserIds: [],
    entries: [],
    needs_clarification: !!parsed.needs_clarification,
    clarification_question: parsed.clarification_question || null,
    unknown_names: [...new Set([...(parsed.unknown_names || []), ...unknown])],
    ambiguous_names: [...new Set(ambiguous)],
  };

  if (parsed.paidByName) {
    const payer = resolveName(parsed.paidByName);
    if (payer) result.paidByUserId = payer.user_id;
  }

  if (result.splitType === 'equal') {
    const excludedIds = new Set();
    for (const n of parsed.excludedNames || []) {
      const u = resolveName(n);
      if (u) excludedIds.add(u.user_id);
    }
    const includedIds = [];
    for (const m of members) {
      if (!excludedIds.has(m.user_id)) includedIds.push(m.user_id);
    }
    result.includedUserIds = includedIds;
    result.excludedUserIds = [...excludedIds];
  } else {
    for (const e of parsed.entries || []) {
      const u = resolveName(e.name);
      if (!u) continue;
      const entry = { userId: u.user_id };
      if (Number.isFinite(e.amountInr)) entry.amountPaise = Math.round(e.amountInr * 100);
      if (Number.isFinite(e.percent)) entry.percent = e.percent;
      if (Number.isFinite(e.shares)) entry.shares = e.shares;
      result.entries.push(entry);
    }
  }

  if (
    !result.paidByUserId ||
    result.amountPaise === null ||
    result.unknown_names.length > 0 ||
    result.ambiguous_names.length > 0
  ) {
    result.needs_clarification = true;
    if (!result.clarification_question) {
      result.clarification_question =
        'Kuch naam match nahi hue ya ambiguous hain. Please confirm.';
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Feature: Explain "why this stop?"                                   */
/* ------------------------------------------------------------------ */

async function explainStop({ tripId, userId, item, trip }) {
  const prompt = `
Explain in 2-3 sentences (simple English, friendly tone, occasional Hindi words ok)
why this stop belongs in a trip to ${trip.destination}.
Item: ${JSON.stringify(item)}
Return ONLY JSON: { "explanation": string }
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt,
    tripId,
    userId,
    feature: AI_FEATURES.EXPLAIN_STOP,
  });
  return parsed;
}

module.exports = {
  generateItinerary,
  replan,
  parseExpenseText,
  explainStop,
  fetchTravelTimes,
};