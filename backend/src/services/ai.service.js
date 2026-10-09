'use strict';

const fetch = global.fetch;
const db = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { extractJson } = require('../utils/aiJson');
const { AI_FEATURES, AI_STATUS } = require('../config/constants');

const VISION_MODEL = process.env.VISION_MODEL_NAME || 'gemma3:4b';

/* ------------------------------------------------------------------ */
/* Provider: Ollama                                                    */
/* ------------------------------------------------------------------ */

async function callOllama({ prompt, system, model }) {
  const body = {
    model,
    prompt,
    system,
    stream: false,
    format: 'json',
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
/* Provider: OpenAI-compatible                                        */
/* ------------------------------------------------------------------ */

async function callOpenAICompatible({ prompt, system, model }) {
  if (!env.AI_API_URL) throw new Error('AI_API_URL is required');
  if (!env.AI_API_KEY) throw new Error('AI_API_KEY is required');

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
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
    return json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Unified call + logging                                              */
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
    if (expectArray && !Array.isArray(parsed)) throw new Error('Expected a JSON array');
  } catch (err) {
    status = AI_STATUS.ERROR;
    errorMessage = err.message;
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

  if (status === AI_STATUS.ERROR) throw ApiError.internal(`AI service failed: ${errorMessage}`);
  return { parsed, raw, latencyMs: Date.now() - started };
}

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
/* OSRM                                                                */
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
/* Features                                                            */
/* ------------------------------------------------------------------ */

async function generateItinerary({ tripId, userId, params }) {
  const { destination, days, groupSize, budgetPerPersonPaise, interests, foodPreference, notes } = params;
  const budgetInr = budgetPerPersonPaise ? Math.round(budgetPerPersonPaise / 100) : null;

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
    { "dayNumber": number, "theme": string,
      "items": [ { "title": string, "place": string, "startTime": "HH:MM",
                   "costEstimateInr": number, "notes": string } ] }
  ],
  "tips": [string]
}
All costs in INR (integers). Keep each day to 3-5 items. Respect food preference strictly.
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.GENERATE_ITINERARY,
  });
  return parsed;
}

async function replan({ tripId, userId, params, existingItems }) {
  const { reason, affectedDayNumbers } = params;
  const context = existingItems
    .filter((i) => affectedDayNumbers.includes(i.day_number))
    .map((i) => ({
      day: i.day_number, title: i.title, place: i.place,
      startTime: i.start_time,
      costInr: i.cost_estimate_paise ? Math.round(i.cost_estimate_paise / 100) : 0,
      notes: i.notes,
    }));

  const prompt = `
Re-plan ONLY certain days of a trip.
Reason: ${reason}
Affected days: ${affectedDayNumbers.join(', ')}
Existing plan (JSON): ${JSON.stringify(context, null, 2)}

Return ONLY:
{
  "days": [ { "dayNumber": number, "theme": string,
              "items": [ { "title": string, "place": string, "startTime": "HH:MM",
                           "costEstimateInr": number, "notes": string } ] } ],
  "explanation": string
}
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.REPLAN,
  });
  return parsed;
}

async function parseExpenseText({ tripId, userId, text, members }) {
  const memberList = members.map((m) => ({ id: m.user_id, name: m.name }));
  const prompt = `
Parse a group-trip expense in English or Hinglish.
Members: ${JSON.stringify(memberList)}
Text: """${text}"""

Return ONLY:
{
  "title": string,
  "amountInr": number,
  "paidByName": string,
  "splitType": "equal"|"exact"|"percent"|"shares",
  "excludedNames": [string],
  "includedNames": [string],
  "entries": [ { "name": string, "amountInr": number, "percent": number, "shares": number } ],
  "needs_clarification": boolean,
  "clarification_question": string|null,
  "unknown_names": [string]
}
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.PARSE_EXPENSE,
  });

  const byName = new Map();
  for (const m of members) {
    const k = m.name.trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(m);
  }
  const ambiguous = [];
  const unknown = [];
  const resolveName = (name) => {
    if (!name || typeof name !== 'string') return null;
    const k = name.trim().toLowerCase();
    const matches = byName.get(k) || [];
    if (matches.length === 0) {
      const partial = [...byName.entries()].filter(([key]) => key.startsWith(k.split(' ')[0]));
      if (partial.length === 1) return partial[0][1][0];
      if (partial.length > 1) { ambiguous.push(name); return null; }
      unknown.push(name);
      return null;
    }
    if (matches.length > 1) { ambiguous.push(name); return null; }
    return matches[0];
  };

  const result = {
    title: parsed.title || 'Expense',
    amountPaise: Number.isFinite(parsed.amountInr) ? Math.round(parsed.amountInr * 100) : null,
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

  if (!result.paidByUserId || result.amountPaise === null ||
      result.unknown_names.length || result.ambiguous_names.length) {
    result.needs_clarification = true;
    if (!result.clarification_question) {
      result.clarification_question = 'Kuch naam match nahi hue ya ambiguous hain. Please confirm.';
    }
  }
  return result;
}

async function explainStop({ tripId, userId, item, trip }) {
  const prompt = `
Explain in 2-3 sentences why this stop belongs in a trip to ${trip.destination}.
Item: ${JSON.stringify(item)}
Return ONLY: { "explanation": string }
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.EXPLAIN_STOP,
  });
  return parsed;
}

async function packingSuggest({ tripId, userId, destination, startDate, endDate, season, groupSize, itineraryItems, notes }) {
  const activityList = (itineraryItems || []).map((i) => ({ title: i.title, place: i.place }));
  const prompt = `
Help a group of ${groupSize} Indian travellers pack for ${destination}.
Dates: ${startDate} to ${endDate}. Season: ${season}.
Activities: ${JSON.stringify(activityList)}
${notes ? `Notes: ${notes}` : ''}

Return ONLY:
{ "items": [ { "name": string, "category": "clothing"|"toiletries"|"electronics"|"documents"|"medicines"|"food"|"misc", "quantity": number, "reason": string } ] }
Keep it communal, 10-18 items.
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.PACKING_SUGGEST,
  });
  return { items: Array.isArray(parsed.items) ? parsed.items : [] };
}

async function budgetSwaps({ tripId, userId, destination, overspendPaise, items, diets, maxSwaps = 5 }) {
  const slimItems = items.map((i) => ({
    id: i.id, day: i.day_number, title: i.title, place: i.place,
    costInr: i.cost_estimate_paise ? Math.round(i.cost_estimate_paise / 100) : 0,
    notes: i.notes,
  }));
  const prompt = `
Trip to ${destination} projected to overspend by ~₹${Math.round(overspendPaise / 100)}.
Diets: ${diets.join(', ') || 'mixed'}.
Items (JSON): ${JSON.stringify(slimItems, null, 2)}

Suggest up to ${maxSwaps} CHEAPER swaps. Return ONLY:
{ "swaps": [ { "originalItemId": string, "replacement": { "title": string, "place": string, "estimatedCostInr": number }, "savingInr": number, "reason": string } ] }
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.BUDGET_SWAPS,
  });
  const valid = (parsed.swaps || []).filter(
    (s) => s && typeof s.originalItemId === 'string' && s.replacement &&
      typeof s.replacement.title === 'string' && Number.isFinite(s.replacement.estimatedCostInr)
  );
  const swaps = valid.slice(0, maxSwaps).map((s) => ({
    originalItemId: s.originalItemId,
    replacement: {
      title: s.replacement.title,
      place: s.replacement.place || null,
      estimatedCostPaise: Math.max(0, Math.round(s.replacement.estimatedCostInr * 100)),
      reason: s.reason || null,
    },
    savingPaise: Math.max(0, Number.isFinite(s.savingInr) ? Math.round(s.savingInr * 100) : 0),
  }));
  return { swaps };
}

async function wrappedCaptions({ tripId, wrapped }) {
  const awards = (wrapped.awards || []).map((a) => ({
    key: a.key, title: a.title, name: a.name, valuePaise: a.valuePaise, note: a.note || null,
  }));
  const prompt = `
Awards from trip "${wrapped.title}" to ${wrapped.destination}:
${JSON.stringify(awards, null, 2)}
Write ONE short playful Hinglish caption (max 60 chars) per award key.
Return ONLY: { "captions": { "<award_key>": "caption" } }
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId: null, feature: AI_FEATURES.WRAPPED_CAPTIONS,
  });
  return { captions: parsed.captions && typeof parsed.captions === 'object' ? parsed.captions : {} };
}

async function nextPayerExplain({ tripId, name, amountPaise, netBalancePaise, reason }) {
  const amtInr = Math.round(amountPaise / 100);
  const net = Math.round(netBalancePaise / 100);
  const prompt = `
Expense ₹${amtInr} needs a payer. Algorithm suggests "${name}".
Their net balance: ${net >= 0 ? '+' : ''}₹${net}.
Reason: "${reason}"
Write ONE short Hinglish/English sentence (max 140 chars).
Return ONLY: { "explanation": string }
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId: null, feature: AI_FEATURES.NEXT_PAYER_EXPLAIN,
  });
  return { explanation: typeof parsed.explanation === 'string' ? parsed.explanation : reason };
}

async function classifyReceiptItems({ tripId, userId, items }) {
  const list = items.map((i) => i.name);
  const prompt = `
Classify Indian food items for diet-awareness.
Items: ${JSON.stringify(list)}
Return ONLY:
{ "results": [ { "name": string, "diet_class": "veg"|"egg"|"non_veg", "jain_ok": boolean, "confidence": number } ] }
`.trim();
  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId, feature: AI_FEATURES.CLASSIFY_RECEIPT_ITEMS,
  });
  return Array.isArray(parsed?.results) ? parsed.results : [];
}

async function explainTransfer({ tripId, facts }) {
  const amtInr = Math.round(facts.amountPaise / 100);
  const fromPaid = Math.round(facts.fromTotalPaidPaise / 100);
  const fromShare = Math.round(facts.fromTotalSharePaise / 100);
  const toPaid = Math.round(facts.toTotalPaidPaise / 100);
  const toShare = Math.round(facts.toTotalSharePaise / 100);
  const topItems = (facts.fromTopExpenses || [])
    .map((e) => `${e.title} (₹${Math.round(e.amountPaise / 100)})`)
    .join(', ');

  const prompt = `
Explain in ONE sentence (English or Hinglish, max 20 words) why this settle-up is needed.
Use ONLY these exact numbers:
- ${facts.fromName} paid ₹${fromPaid}, share ₹${fromShare}
- ${facts.toName} paid ₹${toPaid}, share ₹${toShare}
- Transfer: ₹${amtInr}
${topItems ? `- ${facts.fromName}'s big spends: ${topItems}` : ''}
Return ONLY: { "explanation": string }
`.trim();

  const { parsed } = await callLLMWithRetry({
    prompt, tripId, userId: null, feature: 'explain_transfer',
  });

  return {
    explanation:
      typeof parsed.explanation === 'string' && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : '',
  };
}

/* ------------------------------------------------------------------ */
/* Assistant — intent + slots classifier                               */
/* ------------------------------------------------------------------ */

async function classifyIntentAndSlots({ tripId, userId, prompt }) {
  return callLLMWithRetry({
    prompt,
    tripId,
    userId,
    feature: 'assistant_classify',
  });
}

/* ------------------------------------------------------------------ */
/* Assistant — one-line clarification rewriter                         */
/* ------------------------------------------------------------------ */

async function polishClarification({ tripId, userId, rawQuestion, quickReplies }) {
  const prompt = `
Rewrite this into ONE short friendly Hinglish question (max 100 chars).
Keep the meaning. Do not add new facts.
Original: """${rawQuestion}"""
Quick replies: ${JSON.stringify(quickReplies || [])}
Return ONLY: { "question": string }
`.trim();

  try {
    const { parsed } = await callLLMWithRetry({
      prompt, tripId, userId, feature: 'assistant_clarify',
    });
    return typeof parsed.question === 'string' && parsed.question.trim()
      ? parsed.question.trim()
      : rawQuestion;
  } catch (_) {
    return rawQuestion;
  }
}

module.exports = {
  generateItinerary,
  replan,
  parseExpenseText,
  explainStop,
  fetchTravelTimes,
  packingSuggest,
  budgetSwaps,
  wrappedCaptions,
  nextPayerExplain,
  classifyReceiptItems,
  explainTransfer,
  classifyIntentAndSlots,
  polishClarification,
  VISION_MODEL,
};