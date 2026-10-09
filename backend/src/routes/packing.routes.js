'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireTripMember } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  createItemSchema,
  updateItemSchema,
  claimSchema,
  bulkClaimSchema,
  listQuery,
  suggestSchema,
  tripIdParam,
  itemIdParam,
} = require('../validators/packing.validator');
const ctrl = require('../controllers/packing.controller');

// Trip-scoped router (mounted at /api/v1/trips/:tripId/packing)
const tripRouter = express.Router({ mergeParams: true });
tripRouter.use(requireAuth, validate(tripIdParam, 'params'), requireTripMember);
tripRouter.get('/', validate(listQuery, 'query'), ctrl.list);
tripRouter.post('/', validate(createItemSchema), ctrl.create);
tripRouter.post('/bulk-claim', validate(bulkClaimSchema), ctrl.bulkClaim);
tripRouter.post('/suggest', aiLimiter, validate(suggestSchema), ctrl.suggest);

// Item-scoped router (mounted at /api/v1/packing-items)
const itemRouter = express.Router();
itemRouter.use(requireAuth);
itemRouter.patch(
  '/:itemId',
  validate(itemIdParam, 'params'),
  validate(updateItemSchema),
  ctrl.update
);
itemRouter.delete('/:itemId', validate(itemIdParam, 'params'), ctrl.remove);
itemRouter.post(
  '/:itemId/claim',
  validate(itemIdParam, 'params'),
  validate(claimSchema),
  ctrl.claim
);
itemRouter.post(
  '/:itemId/unclaim',
  validate(itemIdParam, 'params'),
  ctrl.unclaim
);
itemRouter.post('/:itemId/pack', validate(itemIdParam, 'params'), ctrl.pack);

module.exports = { tripRouter, itemRouter };