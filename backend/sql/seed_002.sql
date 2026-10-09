-- ============================================================================
-- SafarSplit — Seed 002
-- Demo data for: packing list, a completed & public Manali trip, and a few
-- categorised expenses. Uses UUIDs from seed.sql where possible.
-- Idempotent for the demo rows via DELETE-guard by known ids.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Packing list for the Goa trip (aaaaaaaa-...-aaaa1)
-- ---------------------------------------------------------------------------

-- Wipe any previous seed rows for this trip so re-runs are clean.
DELETE FROM packing_items
WHERE trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  AND id IN (
    'dddddddd-dddd-dddd-dddd-dddddddddd01',
    'dddddddd-dddd-dddd-dddd-dddddddddd02',
    'dddddddd-dddd-dddd-dddd-dddddddddd03',
    'dddddddd-dddd-dddd-dddd-dddddddddd04',
    'dddddddd-dddd-dddd-dddd-dddddddddd05',
    'dddddddd-dddd-dddd-dddd-dddddddddd06'
  );

INSERT INTO packing_items
  (id, trip_id, name, category, quantity, claimed_by, claimed_at,
   is_packed, created_by, source)
VALUES
  -- Claimed by Rahul, packed
  ('dddddddd-dddd-dddd-dddd-dddddddddd01',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Sunscreen SPF 50', 'toiletries', 1,
   '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 hours',
   TRUE,
   '11111111-1111-1111-1111-111111111111', 'manual'),

  -- Claimed by Priya, not yet packed
  ('dddddddd-dddd-dddd-dddd-dddddddddd02',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Beach towel', 'clothing', 2,
   '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 hour',
   FALSE,
   '22222222-2222-2222-2222-222222222222', 'manual'),

  -- Unclaimed (anyone can grab)
  ('dddddddd-dddd-dddd-dddd-dddddddddd03',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Portable Bluetooth speaker', 'misc', 1,
   NULL, NULL, FALSE,
   '11111111-1111-1111-1111-111111111111', 'manual'),

  -- AI-suggested unclaimed item (packing list generator)
  ('dddddddd-dddd-dddd-dddd-dddddddddd04',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Power bank (10,000 mAh)', 'electronics', 1,
   NULL, NULL, FALSE,
   '22222222-2222-2222-2222-222222222222', 'ai'),

  -- Duplicate-risk item #1: "Sunscreen" (someone else might add again)
  ('dddddddd-dddd-dddd-dddd-dddddddddd05',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Sunscreen', 'toiletries', 1,
   NULL, NULL, FALSE,
   '33333333-3333-3333-3333-333333333333', 'manual'),

  -- Duplicate-risk item #2: another "Sunscreen SPF 50" (same as #1 but by another user)
  ('dddddddd-dddd-dddd-dddd-dddddddddd06',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'Sunscreen SPF 50', 'toiletries', 1,
   NULL, NULL, FALSE,
   '44444444-4444-4444-4444-444444444444', 'manual');


-- ---------------------------------------------------------------------------
-- 2. Manali trip → completed & public
-- ---------------------------------------------------------------------------
UPDATE trips
   SET status       = 'completed',
       is_public    = TRUE,
       published_at = NOW() - INTERVAL '5 days',
       public_summary = 'Snow, cafes, and Old Manali vibes — a 5-day winter escape for 3.',
       tags         = ARRAY['mountain','winter','cafes','snow'],
       fork_count   = 0
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';


-- ---------------------------------------------------------------------------
-- 3. A few categorised expenses for the Goa trip
--    Categories: food, transport, stay, activities, tea, other
-- ---------------------------------------------------------------------------

DELETE FROM expenses
WHERE trip_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  AND id IN (
    'cccccccc-cccc-cccc-cccc-cccccccccc10',
    'cccccccc-cccc-cccc-cccc-cccccccccc11',
    'cccccccc-cccc-cccc-cccc-cccccccccc12',
    'cccccccc-cccc-cccc-cccc-cccccccccc13'
  );

INSERT INTO expenses
  (id, trip_id, paid_by_user_id, amount_paise, description,
   category, split_type, spent_at)
VALUES
  -- FOOD: Rahul paid ₹2,400, split equally among all 4
  ('cccccccc-cccc-cccc-cccc-cccccccccc10',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '11111111-1111-1111-1111-111111111111',
   240000, 'Dinner at Fisherman''s Wharf',
   'food', 'equal',
   '2026-11-14 21:30:00+05:30'),

  -- TRANSPORT: Priya paid ₹800, split equally between Priya & Sneha
  ('cccccccc-cccc-cccc-cccc-cccccccccc11',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '22222222-2222-2222-2222-222222222222',
   80000, 'Scooter rentals — 2 days',
   'transport', 'equal',
   '2026-11-15 09:00:00+05:30'),

  -- TEA: Amit paid ₹240 for chai rounds, split equally among 4
  ('cccccccc-cccc-cccc-cccc-cccccccccc12',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '33333333-3333-3333-3333-333333333333',
   24000, 'Chai + snacks at Baga',
   'tea', 'equal',
   '2026-11-15 17:30:00+05:30'),

  -- ACTIVITIES: Sneha paid ₹1,000 for parasailing, split only Sneha & Rahul
  ('cccccccc-cccc-cccc-cccc-cccccccccc13',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '44444444-4444-4444-4444-444444444444',
   100000, 'Parasailing at Baga beach',
   'activities', 'equal',
   '2026-11-15 11:00:00+05:30');

-- Splits — each row sums to expense.amount_paise
DELETE FROM expense_splits
WHERE expense_id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccc10',
  'cccccccc-cccc-cccc-cccc-cccccccccc11',
  'cccccccc-cccc-cccc-cccc-cccccccccc12',
  'cccccccc-cccc-cccc-cccc-cccccccccc13'
);

INSERT INTO expense_splits (expense_id, user_id, share_paise) VALUES
  -- FOOD: 240000 / 4 = 60000 each
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', '11111111-1111-1111-1111-111111111111', 60000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', '22222222-2222-2222-2222-222222222222', 60000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', '33333333-3333-3333-3333-333333333333', 60000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', '44444444-4444-4444-4444-444444444444', 60000),

  -- TRANSPORT: 80000 / 2 = 40000 each
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', '22222222-2222-2222-2222-222222222222', 40000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', '44444444-4444-4444-4444-444444444444', 40000),

  -- TEA: 24000 / 4 = 6000 each
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', '11111111-1111-1111-1111-111111111111',  6000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', '22222222-2222-2222-2222-222222222222',  6000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', '33333333-3333-3333-3333-333333333333',  6000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', '44444444-4444-4444-4444-444444444444',  6000),

  -- ACTIVITIES: 100000 / 2 = 50000 each
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', '44444444-4444-4444-4444-444444444444', 50000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', '11111111-1111-1111-1111-111111111111', 50000);


-- ---------------------------------------------------------------------------
-- 4. Optional: a couple of sync_ops rows so you can eyeball the audit log
-- ---------------------------------------------------------------------------

DELETE FROM sync_ops
WHERE client_op_id IN (
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e001',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e002'
);

INSERT INTO sync_ops
  (client_op_id, user_id, trip_id, op_type, payload, status)
VALUES
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e001',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'expense.create',
   '{"title":"Chai","amount_paise":24000,"split_type":"equal"}'::jsonb,
   'applied'),

  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e002',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'packing.create',
   '{"name":"Beach towel","quantity":2}'::jsonb,
   'applied');

COMMIT;

-- ============================================================================
-- End of seed 002
-- ============================================================================