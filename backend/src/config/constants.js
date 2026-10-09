'use strict';

module.exports = {
  ROLES: { OWNER: 'owner', MEMBER: 'member' },

  TRIP_STATUS: {
    PLANNING: 'planning',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  SPLIT_TYPES: {
    EQUAL: 'equal',
    EXACT: 'exact',
    PERCENT: 'percent',
    SHARES: 'shares',
  },

  VOTE_VALUES: { UP: 'up', DOWN: 'down' },

  WALLET_TX_TYPES: {
    CREDIT: 'credit',
    DEBIT: 'debit',
    TRANSFER_IN: 'transfer_in',
    TRANSFER_OUT: 'transfer_out',
  },

  AI_FEATURES: {
    GENERATE_ITINERARY: 'generate_itinerary',
    REPLAN: 'replan',
    PARSE_EXPENSE: 'parse_expense',
    EXPLAIN_STOP: 'explain_stop',
    PACKING_SUGGEST: 'packing_suggest',
    BUDGET_SWAPS: 'budget_swaps',
    WRAPPED_CAPTIONS: 'wrapped_captions',
    NEXT_PAYER_EXPLAIN: 'next_payer_explain',
    READ_RECEIPT: 'read_receipt',
    CLASSIFY_RECEIPT_ITEMS: 'classify_receipt_items',
  },

  AI_STATUS: {
    SUCCESS: 'success',
    INVALID_JSON: 'invalid_json',
    ERROR: 'error',
    NEEDS_CLARIFICATION: 'needs_clarification',
  },

  ALLOWED_MIME: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ],

  EXPENSE_CATEGORIES: [
    'food',
    'transport',
    'stay',
    'activities',
    'tea',
    'other',
  ],

  SYNC_OP_TYPES: [
    'expense.create',
    'vote.set',
    'packing.add',
    'packing.claim',
    'packing.pack',
    'itinerary.add',
  ],

  SYNC_OP_STATUS: {
    APPLIED: 'applied',
    REJECTED: 'rejected',
    DUPLICATE: 'duplicate',
  },

  BUDGET_LEVELS: {
    OK: 'ok',
    WARNING: 'warning',
    DANGER: 'danger',
  },

  WRAPPED_AWARDS: {
    SPONSOR: 'ultimate_sponsor',
    CHAI: 'chai_champion',
    PINCHER: 'penny_pincher',
    SPLURGE: 'biggest_splurge',
    SPEEDSTER: 'settleup_speedster',
  },

  PACKING_CATEGORIES: [
    'clothing',
    'toiletries',
    'electronics',
    'documents',
    'medicines',
    'food',
    'misc',
  ],
};