'use strict';

/**
 * Robust JSON extractor for LLM output.
 * Handles:
 *  - pure JSON
 *  - fenced ```json ... ```
 *  - leading/trailing prose around the first {...} or [...]
 */
function extractJson(raw) {
  if (typeof raw !== 'string') throw new Error('AI output not a string');
  const text = raw.trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    /* fallthrough */
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {
      /* fallthrough */
    }
  }

  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  if (firstObj === -1 && firstArr === -1) {
    throw new Error('No JSON found in AI output');
  }

  let start;
  let openChar;
  let closeChar;
  if (firstObj === -1 || (firstArr !== -1 && firstArr < firstObj)) {
    start = firstArr;
    openChar = '[';
    closeChar = ']';
  } else {
    start = firstObj;
    openChar = '{';
    closeChar = '}';
  }

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }
  }

  throw new Error('Unbalanced JSON in AI output');
}

module.exports = { extractJson };