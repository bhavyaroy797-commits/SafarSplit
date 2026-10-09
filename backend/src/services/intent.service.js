'use strict';

const aiService = require('./ai.service');
const { matchMember, matchAllMembers } = require('../utils/fuzzyMatch');
const { parseAmountToPaise } = require('../utils/amountParser');
const nluFallback = require('../utils/nluFallback');

const INTENTS = [
  'add_expense',
  'add_multiple_expenses',
  'edit_expense',
  'delete_expense',
  'query_balance',
  'settle_up',
  'add_packing',
  'claim_item',
  'vote',
  'unknown',
];

/**
 * Classify intent + extract slots using the LLM, with a rule-based fallback.
 * Returns { intent, slots, source: 'llm' | 'fallback', confidence }.
 */
async function classifyAndExtract({ tripId, userId, text, members, recentTurns = [] }) {
  const memberList = members.map((m) => ({ id: m.id, name: m.name }));

  const context = recentTurns
    .slice(-4)
    .map((t) => `${t.role === 'user' ? 'U' : 'A'}: ${t.text}`)
    .join('\n');

  const prompt = `
You are the intent classifier for SafarSplit's expense assistant.
Understand English and Hinglish (Roman Hindi). Handle typos and coreference.

Allowed intents: ${INTENTS.join(', ')}.

Trip members: ${JSON.stringify(memberList)}

${context ? `Recent conversation:\n${context}\n` : ''}
User message: """${text}"""

Return ONLY this JSON:
{
  "intent": "one of the intents above",
  "slots": {
    "payerName": string|null,
    "amountText": string|null,
    "description": string|null,
    "excludedNames": [string],
    "participantNames": [string],
    "splitType": "equal"|"exact"|"percent"|"shares"|null,
    "referenceHint": string|null
  },
  "multipleExpenses": [ { "payerName": string, "amountText": string, "description": string } ],
  "confidence": number
}
Rules:
- Extract names EXACTLY as written by the user (we match them in code).
- amountText is the raw amount phrase (e.g. "1.2k", "dedh sau"). We parse in code.
- referenceHint captures coreference ("uska bhi", "same split", "wo cab wala").
- multipleExpenses is filled only if the message contains more than one expense.
- If unsure, return intent="unknown".
`.trim();

  try {
    const { parsed } = await aiService.classifyIntentAndSlots({
      tripId,
      userId,
      prompt,
    });
    if (!parsed || typeof parsed.intent !== 'string' || !INTENTS.includes(parsed.intent)) {
      throw new Error('invalid intent from LLM');
    }
    return {
      intent: parsed.intent,
      slots: sanitizeSlots(parsed.slots || {}),
      multipleExpenses: Array.isArray(parsed.multipleExpenses) ? parsed.multipleExpenses : [],
      source: 'llm',
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0.7,
    };
  } catch (_) {
    const fallbackIntent = nluFallback.detectIntent(text);
    const fallbackSlots = nluFallback.extractSlots(text, members);
    return {
      intent: fallbackIntent,
      slots: sanitizeSlots(fallbackSlots),
      multipleExpenses: [],
      source: 'fallback',
      confidence: 0.5,
    };
  }
}

function sanitizeSlots(s) {
  return {
    payerName: typeof s.payerName === 'string' ? s.payerName.trim() : null,
    amountText: typeof s.amountText === 'string' ? s.amountText.trim() : null,
    description: typeof s.description === 'string' ? s.description.trim() : null,
    excludedNames: Array.isArray(s.excludedNames) ? s.excludedNames.filter(Boolean) : [],
    participantNames: Array.isArray(s.participantNames) ? s.participantNames.filter(Boolean) : [],
    splitType: s.splitType && ['equal', 'exact', 'percent', 'shares'].includes(s.splitType)
      ? s.splitType
      : null,
    referenceHint: typeof s.referenceHint === 'string' ? s.referenceHint.trim() : null,
  };
}

/**
 * Resolve names → member ids. Returns { members, unknown, ambiguous }.
 * Ambiguity is a first-class concept: we must ask ONE question in that case.
 */
function resolveSlots(slots, members) {
  const resolved = {
    payerId: null,
    payerName: null,
    amountPaise: null,
    description: slots.description,
    splitType: slots.splitType || 'equal',
    excludedIds: [],
    includedIds: [],
    unknownNames: [],
    ambiguous: [],
  };

  if (slots.amountText) {
    resolved.amountPaise = parseAmountToPaise(slots.amountText);
  }

  if (slots.payerName) {
    const r = matchMember(slots.payerName, members);
    if (r.match) {
      resolved.payerId = r.match.id;
      resolved.payerName = r.match.name;
    } else if (r.candidates.length > 1) {
      resolved.ambiguous.push({
        slot: 'payer',
        raw: slots.payerName,
        candidates: r.candidates.map((c) => ({ id: c.member.id, name: c.member.name })),
      });
    } else {
      resolved.unknownNames.push(slots.payerName);
    }
  }

  const excluded = new Set();
  for (const n of slots.excludedNames) {
    const r = matchMember(n, members);
    if (r.match) excluded.add(r.match.id);
    else if (r.candidates.length > 1) {
      resolved.ambiguous.push({
        slot: 'exclusion',
        raw: n,
        candidates: r.candidates.map((c) => ({ id: c.member.id, name: c.member.name })),
      });
    } else {
      resolved.unknownNames.push(n);
    }
  }
  resolved.excludedIds = [...excluded];

  // Participants: if explicitly mentioned, use them; else everyone except excluded
  if (slots.participantNames?.length) {
    const ids = [];
    for (const n of slots.participantNames) {
      const r = matchMember(n, members);
      if (r.match) ids.push(r.match.id);
      else if (r.candidates.length > 1) {
        resolved.ambiguous.push({
          slot: 'participant',
          raw: n,
          candidates: r.candidates.map((c) => ({ id: c.member.id, name: c.member.name })),
        });
      } else {
        resolved.unknownNames.push(n);
      }
    }
    resolved.includedIds = ids;
  } else {
    resolved.includedIds = members
      .map((m) => m.id)
      .filter((id) => !excluded.has(id));
  }

  return resolved;
}

module.exports = { classifyAndExtract, resolveSlots, INTENTS };