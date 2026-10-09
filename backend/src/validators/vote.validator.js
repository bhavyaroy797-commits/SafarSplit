'use strict';

const { z } = require('zod');
const { VOTE_VALUES } = require('../config/constants');

const castVoteSchema = z.object({
  itemId: z.string().uuid('Invalid itemId'),
  value: z.enum([VOTE_VALUES.UP, VOTE_VALUES.DOWN]),
});

const itemIdParam = z.object({ itemId: z.string().uuid('Invalid itemId') });

module.exports = { castVoteSchema, itemIdParam };