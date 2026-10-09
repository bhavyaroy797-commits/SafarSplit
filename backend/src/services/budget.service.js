'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const { BUDGET_LEVELS } = require('../config/constants');

/**
 * Compute budget metrics for a trip.
 *
 * Canonical budget column is `trips.budget_paise`.
 * Budget = budget_paise (integer paise), 0 if not set.
 * Spent  = SUM(expenses.amount_paise)
 * Planned remaining = SUM(itinerary_items.cost_estimate_paise) for non-removed items.
 */
async function getBudgetSummary(tripId) {
  const tripRes = await db.query(
    `SELECT id, start_date, end_date, budget_paise,
            budget_alert_threshold_pct, destination, status
       FROM trips WHERE id = $1`,
    [tripId]
  );
  const trip = tripRes.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');

  const budgetPaise =
    trip.budget_paise != null ? Number(trip.budget_paise) : 0;

  const spentRes = await db.query(
    'SELECT COALESCE(SUM(amount_paise),0)::bigint AS spent FROM expenses WHERE trip_id = $1',
    [tripId]
  );
  const spentPaise = Number(spentRes.rows[0].spent);

  const plannedRes = await db.query(
    `SELECT COALESCE(SUM(cost_estimate_paise),0)::bigint AS planned
       FROM itinerary_items
      WHERE trip_id = $1
        AND status <> 'removed'
        AND cost_estimate_paise IS NOT NULL`,
    [tripId]
  );
  const plannedRemainingPaise = Number(plannedRes.rows[0].planned);

  // Days: inclusive of both start and end.
  const today = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

  let daysElapsed = 0;
  if (today >= start) {
    daysElapsed = Math.min(
      totalDays,
      Math.round((today - start) / 86400000) + 1
    );
  }

  const remainingPaise = Math.max(0, budgetPaise - spentPaise);
  const percentUsed = budgetPaise > 0 ? (spentPaise / budgetPaise) * 100 : 0;
  const percentDaysElapsed = (daysElapsed / totalDays) * 100;

  const dailyBurnPaise = daysElapsed > 0 ? spentPaise / daysElapsed : 0;
  const projectedTotalPaise = dailyBurnPaise * totalDays;
  const projectedOverspendPaise = Math.max(
    0,
    projectedTotalPaise - budgetPaise
  );

  const threshold = trip.budget_alert_threshold_pct ?? 80;
  let level = BUDGET_LEVELS.OK;
  if (budgetPaise > 0) {
    if (percentUsed >= 100) level = BUDGET_LEVELS.DANGER;
    else if (percentUsed >= threshold) level = BUDGET_LEVELS.WARNING;

    // Escalate based on pace, even if we haven't crossed the % yet.
    if (projectedTotalPaise > budgetPaise * 1.15) {
      level = BUDGET_LEVELS.DANGER;
    } else if (
      projectedTotalPaise > budgetPaise &&
      level === BUDGET_LEVELS.OK
    ) {
      level = BUDGET_LEVELS.WARNING;
    }
  }

  return {
    tripId,
    destination: trip.destination,
    status: trip.status,
    budgetPaise,
    spentPaise,
    remainingPaise,
    plannedRemainingPaise,
    percentUsed: Number(percentUsed.toFixed(1)),
    percentDaysElapsed: Number(percentDaysElapsed.toFixed(1)),
    dailyBurnPaise: Math.round(dailyBurnPaise),
    projectedTotalPaise: Math.round(projectedTotalPaise),
    projectedOverspendPaise: Math.round(projectedOverspendPaise),
    totalDays,
    daysElapsed,
    alertLevel: level,
    alertThresholdPct: threshold,
  };
}

/**
 * When level is warning/danger, ask the AI for cheaper swaps for future items.
 * Returns nothing saved — the client accepts a swap and POSTs /budget/apply.
 */
async function suggestSwaps(tripId, maxSwaps = 5) {
  const summary = await getBudgetSummary(tripId);

  if (summary.alertLevel === BUDGET_LEVELS.OK) {
    return {
      alertLevel: summary.alertLevel,
      swaps: [],
      message: 'Budget is on track — no swaps needed.',
    };
  }

  const itemsRes = await db.query(
    `SELECT id, day_number, title, place, cost_estimate_paise, notes
       FROM itinerary_items
      WHERE trip_id = $1
        AND status <> 'removed'
        AND cost_estimate_paise IS NOT NULL
      ORDER BY day_number, position`,
    [tripId]
  );

  const dietRes = await db.query(
    `SELECT DISTINCT dietary_preference
       FROM users u
       JOIN trip_members tm ON tm.user_id = u.id
      WHERE tm.trip_id = $1`,
    [tripId]
  );
  const diets = dietRes.rows.map((r) => r.dietary_preference);

  const result = await aiService.budgetSwaps({
    tripId,
    destination: summary.destination,
    overspendPaise: summary.projectedOverspendPaise,
    items: itemsRes.rows,
    diets,
    maxSwaps,
  });

  return {
    alertLevel: summary.alertLevel,
    overspendPaise: summary.projectedOverspendPaise,
    swaps: result.swaps || [],
  };
}

/**
 * Apply an accepted swap: replace the item's title, place, cost with the
 * cheaper version. Runs in a transaction and returns before/after so the
 * controller can emit live events.
 */
async function applySwap(tripId, userId, { itemId, replacement }) {
  return db.withTransaction(async (client) => {
    const cur = await client.query(
      'SELECT * FROM itinerary_items WHERE id = $1 FOR UPDATE',
      [itemId]
    );
    const item = cur.rows[0];
    if (!item) throw ApiError.notFound('Itinerary item not found');
    if (item.trip_id !== tripId) {
      throw ApiError.badRequest('Item does not belong to this trip');
    }

    const upd = await client.query(
      `UPDATE itinerary_items
          SET title = $1,
              place = COALESCE($2, place),
              cost_estimate_paise = $3,
              notes = COALESCE($4, notes),
              source = 'ai',
              updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [
        replacement.title,
        replacement.place || null,
        replacement.estimatedCostPaise,
        replacement.reason || null,
        itemId,
      ]
    );

    return {
      before: item,
      after: upd.rows[0],
      savingPaise: Math.max(
        0,
        (item.cost_estimate_paise || 0) - replacement.estimatedCostPaise
      ),
      appliedBy: userId,
    };
  });
}

module.exports = { getBudgetSummary, suggestSwaps, applySwap };