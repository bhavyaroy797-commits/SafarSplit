-- ============================================================================
-- SafarSplit — Seed Data (desi demo)
-- Plain passwords for all demo users: "password123"
-- bcrypt hash below is for "password123" (rounds=10)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Clean slate (safe: only touches seed-owned rows)
-- ---------------------------------------------------------------------------
DELETE FROM ai_requests;
DELETE FROM attachments;
DELETE FROM wallet_transactions;
DELETE FROM wallets;
DELETE FROM expense_splits;
DELETE FROM expenses;
DELETE FROM votes;
DELETE FROM itinerary_items;
DELETE FROM trip_members;
DELETE FROM trips;
DELETE FROM users;

-- ---------------------------------------------------------------------------
-- 1. users  (password: "password123")
-- ---------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, phone, upi_id,
                   dietary_preference, preferred_language)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rahul Sharma',
   'rahul@safarsplit.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   '+919812345678', 'rahul@okhdfcbank', 'non-veg', 'hinglish'),

  ('22222222-2222-2222-2222-222222222222', 'Priya Patel',
   'priya@safarsplit.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   '+919823456789', 'priya@okicici',  'veg',     'en'),

  ('33333333-3333-3333-3333-333333333333', 'Amit Verma',
   'amit@safarsplit.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   '+919834567890', 'amit@oksbi',    'jain',    'hi'),

  ('44444444-4444-4444-4444-444444444444', 'Sneha Iyer',
   'sneha@safarsplit.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   '+919845678901', 'sneha@okaxis',  'eggetarian', 'en');


-- ---------------------------------------------------------------------------
-- 2. trips
-- ---------------------------------------------------------------------------
INSERT INTO trips (id, owner_id, title, destination, description,
                   start_date, end_date, budget_paise, join_code, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '11111111-1111-1111-1111-111111111111',
   'Goa Weekend', 'Goa',
   'Beach, sunsets, seafood aur susegad.',
   '2026-11-14', '2026-11-16', 800000,  -- ₹8,000 / person
   'GOA26X', 'planning'),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   '22222222-2222-2222-2222-222222222222',
   'Manali Snow Trip', 'Manali',
   'Snow, cafes, and Old Manali vibes.',
   '2026-12-20', '2026-12-24', 1500000, -- ₹15,000 / person
   'MANALI7', 'planning');


-- ---------------------------------------------------------------------------
-- 3. trip_members
-- ---------------------------------------------------------------------------
INSERT INTO trip_members (trip_id, user_id, role) VALUES
  -- Goa trip
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '33333333-3333-3333-3333-333333333333', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '44444444-4444-4444-4444-444444444444', 'member'),
  -- Manali trip
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '44444444-4444-4444-4444-444444444444', 'member');


-- ---------------------------------------------------------------------------
-- 4. itinerary_items  (real lat/lng)
-- ---------------------------------------------------------------------------
INSERT INTO itinerary_items
  (id, trip_id, day_number, position, title, place, latitude, longitude,
   start_time, duration_minutes, cost_estimate_paise, notes, status, source, created_by)
VALUES
  -- Goa Day 1
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, 0,
   'Reach Goa & check-in', 'Calangute Beach',
   15.5439, 73.7553, '10:00', 90, 0,
   'Reach hotel, freshen up.', 'confirmed', 'manual',
   '11111111-1111-1111-1111-111111111111'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, 1,
   'Sunset at Fort Aguada', 'Fort Aguada',
   15.4925, 73.7736, '17:00', 120, 50000,
   '₹500 per head entry + parking.', 'proposed', 'ai',
   '22222222-2222-2222-2222-222222222222'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, 2,
   'Dinner at Fisherman''s Wharf', 'Fisherman''s Wharf, Panjim',
   15.4989, 73.8278, '20:30', 90, 120000,
   'Seafood thali. Veg options available.', 'proposed', 'manual',
   '11111111-1111-1111-1111-111111111111'),

  -- Goa Day 2
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, 0,
   'Baga beach water sports', 'Baga Beach',
   15.5553, 73.7517, '09:30', 180, 250000,
   'Parasailing + jet ski. Optional.', 'proposed', 'manual',
   '33333333-3333-3333-3333-333333333333'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, 1,
   'Lunch at Britto''s', 'Britto''s, Baga',
   15.5541, 73.7530, '13:30', 60, 150000,
   'Goan fish curry rice.', 'proposed', 'manual',
   '11111111-1111-1111-1111-111111111111'),

  -- Manali Day 1
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb101',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1, 0,
   'Arrive Manali & cafe hop', 'Old Manali',
   32.2530, 77.1844, '11:00', 240, 80000,
   'Drifters Cafe, Cafe 1947.', 'confirmed', 'manual',
   '22222222-2222-2222-2222-222222222222'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1, 1,
   'Sunset at Hadimba Temple', 'Hadimba Devi Temple',
   32.2432, 77.1782, '16:30', 60, 0,
   'Cedar forest walk.', 'proposed', 'ai',
   '44444444-4444-4444-4444-444444444444'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb103',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 2, 0,
   'Solang Valley snow day', 'Solang Valley',
   32.3131, 77.1550, '09:00', 300, 350000,
   'Snow suit + activities.', 'proposed', 'manual',
   '22222222-2222-2222-2222-222222222222');


-- ---------------------------------------------------------------------------
-- 5. votes
-- ---------------------------------------------------------------------------
INSERT INTO votes (item_id, user_id, value) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '22222222-2222-2222-2222-222222222222', 'up'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '33333333-3333-3333-3333-333333333333', 'up'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '44444444-4444-4444-4444-444444444444', 'down'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', '22222222-2222-2222-2222-222222222222', 'up'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', '11111111-1111-1111-1111-111111111111', 'up'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102', '22222222-2222-2222-2222-222222222222', 'up');

-- Keep denormalized counters consistent
UPDATE itinerary_items i
   SET upvotes   = (SELECT COUNT(*) FROM votes v WHERE v.item_id = i.id AND v.value = 'up'),
       downvotes = (SELECT COUNT(*) FROM votes v WHERE v.item_id = i.id AND v.value = 'down');


-- ---------------------------------------------------------------------------
-- 6. expenses  (amounts in paise)
-- ---------------------------------------------------------------------------
INSERT INTO expenses (id, trip_id, paid_by_user_id, amount_paise, description,
                      category, split_type, spent_at)
VALUES
  -- Goa: Rahul paid ₹4,800 for stay, split equally among 4
  ('cccccccc-cccc-cccc-cccc-cccccccccc01',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '11111111-1111-1111-1111-111111111111',
   480000, 'Airbnb Calangute — 2 nights', 'stay', 'equal',
   '2026-11-14 12:00:00+05:30'),

  -- Goa: Priya paid ₹1,000 for cab, split equally between Priya & Sneha
  ('cccccccc-cccc-cccc-cccc-cccccccccc02',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '22222222-2222-2222-2222-222222222222',
   100000, 'Airport cab', 'travel', 'equal',
   '2026-11-14 10:00:00+05:30'),

  -- Goa: Amit paid ₹2,000 for dinner, split EXACT (unequal plates)
  ('cccccccc-cccc-cccc-cccc-cccccccccc03',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '33333333-3333-3333-3333-333333333333',
   200000, 'Dinner — Fisherman''s Wharf', 'food', 'exact',
   '2026-11-14 21:30:00+05:30'),

  -- Manali: Priya paid ₹2,400 cab, split by percentage (Priya 50%, Rahul 30%, Sneha 20%)
  ('cccccccc-cccc-cccc-cccc-cccccccccc04',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   '22222222-2222-2222-2222-222222222222',
   240000, 'Chandigarh → Manali cab', 'travel', 'percentage',
   '2026-12-20 06:00:00+05:30');


-- ---------------------------------------------------------------------------
-- 7. expense_splits  (must sum exactly to expense.amount_paise)
-- ---------------------------------------------------------------------------
-- Expense 1: 480000 / 4 = 120000 exactly (no remainder)
INSERT INTO expense_splits (expense_id, user_id, share_paise) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '11111111-1111-1111-1111-111111111111', 120000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '22222222-2222-2222-2222-222222222222', 120000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '33333333-3333-3333-3333-333333333333', 120000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '44444444-4444-4444-4444-444444444444', 120000);

-- Expense 2: 100000 / 2 = 50000 exactly
INSERT INTO expense_splits (expense_id, user_id, share_paise) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', '22222222-2222-2222-2222-222222222222', 50000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', '44444444-4444-4444-4444-444444444444', 50000);

-- Expense 3: exact split — 200000 = 60000 + 50000 + 40000 + 50000
INSERT INTO expense_splits (expense_id, user_id, share_paise) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', '11111111-1111-1111-1111-111111111111', 60000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', '22222222-2222-2222-2222-222222222222', 50000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', '33333333-3333-3333-3333-333333333333', 40000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', '44444444-4444-4444-4444-444444444444', 50000);

-- Expense 4: percentage — 240000 = 50% + 30% + 20% = 120000 + 72000 + 48000
INSERT INTO expense_splits (expense_id, user_id, share_paise) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', '22222222-2222-2222-2222-222222222222', 120000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', '11111111-1111-1111-1111-111111111111',  72000),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', '44444444-4444-4444-4444-444444444444',  48000);


-- ---------------------------------------------------------------------------
-- 8. wallets
-- ---------------------------------------------------------------------------
INSERT INTO wallets (user_id, balance_paise) VALUES
  ('11111111-1111-1111-1111-111111111111', 500000),  -- Rahul ₹5,000
  ('22222222-2222-2222-2222-222222222222', 250000),  -- Priya ₹2,500
  ('33333333-3333-3333-3333-333333333333', 100000),  -- Amit  ₹1,000
  ('44444444-4444-4444-4444-444444444444',      0);  -- Sneha ₹0


-- ---------------------------------------------------------------------------
-- 9. wallet_transactions
-- ---------------------------------------------------------------------------
INSERT INTO wallet_transactions
  (wallet_id, type, amount_paise, related_trip_id, counterparty_user_id, reference, note)
SELECT w.id, 'credit', 500000, NULL, NULL, 'SEED-TOPUP-RAHUL', 'Initial seed balance'
  FROM wallets w WHERE w.user_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO wallet_transactions
  (wallet_id, type, amount_paise, related_trip_id, counterparty_user_id, reference, note)
SELECT w.id, 'credit', 250000, NULL, NULL, 'SEED-TOPUP-PRIYA', 'Initial seed balance'
  FROM wallets w WHERE w.user_id = '22222222-2222-2222-2222-222222222222';

INSERT INTO wallet_transactions
  (wallet_id, type, amount_paise, related_trip_id, counterparty_user_id, reference, note)
SELECT w.id, 'credit', 100000, NULL, NULL, 'SEED-TOPUP-AMIT', 'Initial seed balance'
  FROM wallets w WHERE w.user_id = '33333333-3333-3333-3333-333333333333';


-- ---------------------------------------------------------------------------
-- 10. attachments  (metadata only; files are not seeded)
-- ---------------------------------------------------------------------------
INSERT INTO attachments
  (trip_id, uploaded_by, original_name, stored_name, mime_type, size_bytes, kind, title)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '11111111-1111-1111-1111-111111111111',
   'airbnb-booking.pdf',
   'seed-airbnb-booking.pdf',
   'application/pdf', 184320, 'booking', 'Airbnb Calangute confirmation'),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   '22222222-2222-2222-2222-222222222222',
   'manali-cab-receipt.jpg',
   'seed-manali-cab.jpg',
   'image/jpeg', 94208, 'receipt', 'Chandigarh–Manali cab receipt');


-- ---------------------------------------------------------------------------
-- 11. ai_requests  (sample logs)
-- ---------------------------------------------------------------------------
INSERT INTO ai_requests
  (user_id, trip_id, type, prompt, response, model_name, provider, latency_ms, status)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'generate',
   'Plan a 3-day Goa trip for 4 people, budget ₹8000 per person, non-veg ok, love beaches & forts.',
   '{"destination":"Goa","days":[{"dayNumber":1,"items":[{"title":"Fort Aguada"}]}]}'::jsonb,
   'gemma2:9b', 'ollama', 2840, 'success'),

  ('22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   'replan',
   'Snow forecast on day 2 — replan Solang Valley for day 3 instead.',
   '{"days":[{"dayNumber":3,"items":[{"title":"Solang Valley"}]}],"explanation":"Shifted due to snow."}'::jsonb,
   'gemma2:9b', 'ollama', 3120, 'success'),

  ('33333333-3333-3333-3333-333333333333',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'parse_expense',
   'Rahul ne 1200 diye dinner ke liye, Amit ko chhod ke 4 mein split',
   '{"title":"Dinner","amountInr":1200,"paidByName":"Rahul","splitType":"equal","excludedNames":["Amit"],"includedNames":["Rahul","Priya","Sneha"],"needs_clarification":false}'::jsonb,
   'deepseek-chat', 'openai-compatible', 1180, 'success'),

  ('44444444-4444-4444-4444-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   'explain',
   'Why is Solang Valley on day 2?',
   '{"explanation":"Solang Valley is close to Manali and best done early while snow is fresh."}'::jsonb,
   'gemma2:9b', 'ollama', 760, 'success'),

  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'parse_expense',
   'Priya paid 500 for cab',
   '{}'::jsonb,
   'gemma2:9b', 'ollama', 900, 'needs_clarification');

COMMIT;

-- ============================================================================
-- Demo credentials
--   emails : rahul@safarsplit.local | priya@safarsplit.local
--            amit@safarsplit.local  | sneha@safarsplit.local
--   password (plain, for all) : password123
--   join codes: GOA26X (Goa), MANALI7 (Manali)
-- ============================================================================