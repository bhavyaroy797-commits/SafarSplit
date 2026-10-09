'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const aiService = require('../services/ai.service');
const tripService = require('../services/trip.service');
const itineraryService = require('../services/itinerary.service');
const db = require('../config/db');

const generateItinerary = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const result = await aiService.generateItinerary({
    tripId,
    userId: req.user.id,
    params: req.body,
  });
  return ok(res, result);
});

const replan = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const existingItems = await itineraryService.listItems(tripId);
  const result = await aiService.replan({
    tripId,
    userId: req.user.id,
    params: req.body,
    existingItems,
  });
  return ok(res, result);
});

const parseExpense = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const membersRes = await db.query(
    `SELECT tm.user_id, u.name
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
      WHERE tm.trip_id = $1`,
    [tripId]
  );

  const result = await aiService.parseExpenseText({
    tripId,
    userId: req.user.id,
    text: req.body.text,
    members: membersRes.rows,
  });

  return ok(res, result);
});

const explainStop = asyncHandler(async (req, res) => {
  const tripId = req.params.tripId;
  const item = await itineraryService.getItem(req.body.itemId);
  const trip = await tripService.getTrip(tripId);
  const result = await aiService.explainStop({
    tripId,
    userId: req.user.id,
    item,
    trip,
  });
  return ok(res, result);
});

module.exports = { generateItinerary, replan, parseExpense, explainStop };