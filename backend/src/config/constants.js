'use strict';

module.exports = {
  ROLES: {
    OWNER: 'owner',
    MEMBER: 'member',
  },

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

  VOTE_VALUES: {
    UP: 'up',
    DOWN: 'down',
  },

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
};