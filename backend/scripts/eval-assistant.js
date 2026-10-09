#!/usr/bin/env node
'use strict';

/**
 * Evaluation harness for the assistant NLU pipeline.
 * Reports intent accuracy, slot F1, and clarification accuracy.
 * Writes results to docs/eval.md.
 *
 * Usage:
 *   node scripts/eval-assistant.js
 *
 * Requires DATABASE_URL and access to the Ollama endpoint (or will fall back).
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const intentService = require('../src/services/intent.service');
const { parseAmountToPaise } = require('../src/utils/amountParser');
const conversations = require('../tests/assistant.conversations');

/* ------------------------------------------------------------------ */
/* Fake trip context                                                   */
/* ------------------------------------------------------------------ */

// A deterministic demo member list — matches the fixture IDs used elsewhere.
const MEMBERS = [
  { id: 'u-rahul', name: 'Rahul Sharma', diet: 'non-veg' },
  { id: 'u-priya', name: 'Priya Patel', diet: 'veg' },
  { id: 'u-amit', name: 'Amit Verma', diet: 'jain' },
  { id: 'u-sneha', name: 'Sneha Iyer', diet: 'eggetarian' },
];

/* ------------------------------------------------------------------ */
/* Scoring helpers                                                     */
/* ------------------------------------------------------------------ */

function slotSet(expected, predicted) {
  const e = new Set();
  const p = new Set();

  const normalizeName = (s) => (s ? String(s).toLowerCase().trim() : null);
  const normalizeAmt = (s) => {
    if (!s) return null;
    const v = parseAmountToPaise(s);
    return v == null ? null : String(v);
  };

  const add = (set, key, val) => {
    if (val == null) return;
    set.add(`${key}=${val}`);
  };

  if (expected.payerName) add(e, 'payer', normalizeName(expected.payerName));
  if (predicted.payerName) add(p, 'payer', normalizeName(predicted.payerName));

  if (expected.amountText) add(e, 'amt', normalizeAmt(expected.amountText));
  if (predicted.amountText) add(p, 'amt', normalizeAmt(predicted.amountText));

  if (expected.description) add(e, 'desc', normalizeName(expected.description));
  if (predicted.description) add(p, 'desc', normalizeName(predicted.description));

  for (const n of expected.excludedNames || []) add(e, 'excl', normalizeName(n));
  for (const n of predicted.excludedNames || []) add(p, 'excl', normalizeName(n));

  for (const n of expected.participantNames || []) add(e, 'part', normalizeName(n));
  for (const n of predicted.participantNames || []) add(p, 'part', normalizeName(n));

  return { e, p };
}

function f1(expected, predicted) {
  const { e, p } = slotSet(expected, predicted);
  if (e.size === 0 && p.size === 0) return { p: 1, r: 1, f1: 1 };
  let tp = 0;
  for (const v of e) if (p.has(v)) tp++;
  const precision = p.size === 0 ? (e.size === 0 ? 1 : 0) : tp / p.size;
  const recall = e.size === 0 ? 1 : tp / e.size;
  const f = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { p: precision, r: recall, f1: f };
}

/* ------------------------------------------------------------------ */
/* Run one conversation                                                */
/* ------------------------------------------------------------------ */

async function runOne(conv) {
  const lastUser = conv.turns[conv.turns.length - 1];
  const recentTurns = [];
  for (let i = 0; i < conv.turns.length - 1; i++) {
    recentTurns.push({ role: 'user', text: conv.turns[i] });
  }

  const result = await intentService.classifyAndExtract({
    tripId: 'eval-trip',
    userId: 'eval-user',
    text: lastUser,
    members: MEMBERS,
    recentTurns,
  });

  const resolved = intentService.resolveSlots(result.slots, MEMBERS);

  // Determine if the pipeline would have asked a clarification.
  const asksClarification =
    !resolved.amountPaise ||
    !resolved.payerId ||
    resolved.ambiguous.length > 0 ||
    resolved.unknownNames.length > 0;

  let clarificationKind = null;
  if (asksClarification) {
    if (!resolved.amountPaise) clarificationKind = 'amount';
    else if (!resolved.payerId) clarificationKind = 'payer';
    else if (resolved.ambiguous.length) clarificationKind = 'ambiguous';
    else if (resolved.unknownNames.length) clarificationKind = 'unknown_name';
  }

  return {
    intent: result.intent,
    slots: result.slots,
    source: result.source,
    asksClarification,
    clarificationKind,
  };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const results = [];

  let intentHits = 0;
  let slotF1Sum = 0;
  let slotCases = 0;
  let clarifyHits = 0;
  let clarifyCases = 0;

  const perCase = [];

  for (const conv of conversations) {
    let predicted;
    try {
      predicted = await runOne(conv);
    } catch (err) {
      predicted = {
        intent: 'unknown',
        slots: {},
        asksClarification: false,
        error: err.message,
      };
    }

    const intentOk = predicted.intent === conv.expected.intent;
    if (intentOk) intentHits++;

    let slotScore = null;
    if (conv.expected.slots) {
      slotScore = f1(conv.expected.slots, predicted.slots || {});
      slotF1Sum += slotScore.f1;
      slotCases++;
    }

    let clarifyOk = null;
    if (conv.expected.clarification !== undefined && conv.expected.clarification !== null) {
      clarifyOk =
        predicted.asksClarification &&
        (predicted.clarificationKind === conv.expected.clarification ||
          // ambiguous-name cases may report either 'ambiguous' or 'unknown_name'
          (conv.expected.clarification === 'priya-vs-priyanka' &&
            ['ambiguous', 'unknown_name', 'payer'].includes(predicted.clarificationKind)));
      if (clarifyOk) clarifyHits++;
      clarifyCases++;
    }

    perCase.push({
      id: conv.id,
      expected: conv.expected.intent,
      predicted: predicted.intent,
      intentOk,
      slotF1: slotScore ? slotScore.f1.toFixed(3) : '—',
      clarifyExpected: conv.expected.clarification || '—',
      clarifyPredicted: predicted.clarificationKind || '—',
      clarifyOk,
      source: predicted.source,
    });
  }

  const intentAccuracy = ((intentHits / conversations.length) * 100).toFixed(1);
  const slotF1 = slotCases ? (slotF1Sum / slotCases).toFixed(3) : '—';
  const clarifyAccuracy = clarifyCases
    ? ((clarifyHits / clarifyCases) * 100).toFixed(1)
    : '—';

  // ---- Write docs/eval.md ----
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const outFile = path.join(docsDir, 'eval.md');

  const lines = [];
  lines.push('# SafarSplit Assistant — NLU Evaluation');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Conversations: **${conversations.length}**`);
  lines.push(`- Intent accuracy: **${intentAccuracy}%**`);
  lines.push(`- Slot F1 (macro): **${slotF1}**`);
  lines.push(`- Clarification-question accuracy: **${clarifyAccuracy}%**`);
  lines.push('');
  lines.push('## Per-case results');
  lines.push('');
  lines.push('| ID | Expected intent | Predicted intent | Intent OK | Slot F1 | Clarify expected | Clarify predicted | Clarify OK | Source |');
  lines.push('|----|-----------------|------------------|-----------|---------|------------------|-------------------|------------|--------|');
  for (const r of perCase) {
    lines.push(
      `| ${r.id} | ${r.expected} | ${r.predicted} | ${r.intentOk ? '✓' : '✗'} | ${r.slotF1} | ${r.clarifyExpected} | ${r.clarifyPredicted} | ${
        r.clarifyOk == null ? '—' : r.clarifyOk ? '✓' : '✗'
      } | ${r.source || '—'} |`
    );
  }
  lines.push('');

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');

  console.log('');
  console.log('=== SafarSplit Assistant — NLU Evaluation ===');
  console.log(`Conversations:  ${conversations.length}`);
  console.log(`Intent acc:     ${intentAccuracy}%`);
  console.log(`Slot F1:        ${slotF1}`);
  console.log(`Clarify acc:    ${clarifyAccuracy}%`);
  console.log(`Report written: ${outFile}`);
  console.log('');

  // Clean shutdown
  try {
    await db.pool.end();
  } catch (_) {
    /* ignore */
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('eval failed:', err);
  process.exit(1);
});