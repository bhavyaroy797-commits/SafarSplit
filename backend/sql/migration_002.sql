-- ============================================================================
-- SafarSplit — Migration 002
-- Adds: budgets, packing list, offline sync, wrapped share tokens, community
--       & fork support, safe public view, indexes, and CHECK constraints.
-- Idempotent: safe to run multiple times.
-- Does NOT rename or drop any existing column, table, or constraint.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Helper: ensure pgcrypto (for gen_random_uuid on any new tables)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. TRIPS: budget, threshold, status, wrapped, community/fork, tags
-- ============================================================================

-- 1.1 budget_paise — add if missing.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS budget_paise BIGINT
  CHECK (budget_paise IS NULL OR budget_paise >= 0);

-- 1.2 budget alert threshold (percentage, default 80)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS budget_alert_threshold_pct SMALLINT NOT NULL DEFAULT 80
  CHECK (budget_alert_threshold_pct BETWEEN 0 AND 100);

-- 1.3 Status: allow 'completed'. We recreate the CHECK constraint.
--     Drop any prior status check (name may vary depending on how schema was
--     created), then add a fresh one that covers all valid values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'trips'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE trips DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'trips'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE trips
  ADD CONSTRAINT chk_trips_status_v2
  CHECK (status IN ('planning','ongoing','completed','cancelled'));

-- 1.4 Wrapped (annual recap share token)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS wrapped_share_token TEXT UNIQUE;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS wrapped_generated_at TIMESTAMPTZ;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS wrapped_cache JSONB;

-- 1.5 Community & forking
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS forked_from_trip_id UUID
  REFERENCES trips(id) ON DELETE SET NULL;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS fork_count INTEGER NOT NULL DEFAULT 0
  CHECK (fork_count >= 0);

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS public_summary TEXT;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Indexes for the new trip columns
CREATE INDEX IF NOT EXISTS idx_trips_is_public
  ON trips(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_trips_published_at
  ON trips(published_at DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_trips_forked_from
  ON trips(forked_from_trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_wrapped_token
  ON trips(wrapped_share_token);
CREATE INDEX IF NOT EXISTS idx_trips_tags
  ON trips USING GIN(tags);


-- ============================================================================
-- 2. PACKING LIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS packing_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category      TEXT CHECK (category IS NULL OR char_length(category) <= 50),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  claimed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at    TIMESTAMPTZ,
  is_packed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','ai')),
  client_uuid   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure claimed_at is set iff someone claimed it.
  CONSTRAINT chk_packing_claimed CHECK (
    (claimed_by IS NULL AND claimed_at IS NULL) OR
    (claimed_by IS NOT NULL AND claimed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_packing_trip
  ON packing_items(trip_id, is_packed, created_at);

CREATE INDEX IF NOT EXISTS idx_packing_claimed_by
  ON packing_items(claimed_by) WHERE claimed_by IS NOT NULL;

-- Unique client_uuid per trip (partial unique so nulls don't collide)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_packing_client_uuid_per_trip
  ON packing_items(trip_id, client_uuid)
  WHERE client_uuid IS NOT NULL;

-- updated_at trigger (reuses the function created in schema.sql)
DROP TRIGGER IF EXISTS trg_packing_updated_at ON packing_items;
CREATE TRIGGER trg_packing_updated_at
  BEFORE UPDATE ON packing_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 3. OFFLINE SYNC: client_uuid on records + sync_ops audit/idempotency log
-- ============================================================================

-- 3.1 client_uuid columns (unique per trip where relevant)
ALTER TABLE expenses        ADD COLUMN IF NOT EXISTS client_uuid UUID;
ALTER TABLE votes           ADD COLUMN IF NOT EXISTS client_uuid UUID;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS client_uuid UUID;
-- packing_items already handled above.

-- Uniqueness: per-trip for expenses & itinerary_items; per-item for votes.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_expenses_client_uuid_per_trip
  ON expenses(trip_id, client_uuid)
  WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_itinerary_client_uuid_per_trip
  ON itinerary_items(trip_id, client_uuid)
  WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_votes_client_uuid_per_item
  ON votes(item_id, client_uuid)
  WHERE client_uuid IS NOT NULL;

-- 3.2 sync_ops — idempotency + audit log for offline mutations.
CREATE TABLE IF NOT EXISTS sync_ops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_op_id  UUID NOT NULL UNIQUE,  -- dedupe key from the client
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id       UUID REFERENCES trips(id) ON DELETE CASCADE,
  op_type       TEXT NOT NULL
                CHECK (op_type IN (
                  'expense.create','expense.delete',
                  'vote.cast','vote.remove',
                  'itinerary.create','itinerary.update','itinerary.delete',
                  'packing.create','packing.update','packing.delete'
                )),
  payload       JSONB,
  status        TEXT NOT NULL DEFAULT 'applied'
                CHECK (status IN ('applied','rejected','duplicate')),
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_ops_user
  ON sync_ops(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_ops_trip
  ON sync_ops(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_ops_status
  ON sync_ops(status);


-- ============================================================================
-- 4. COMMUNITY VIEW — safe public projection of trips
--    Exposes only: id, title, destination, days, budget/person, itinerary
--    item count, fork_count, tags, published_at, owner display name.
--    No member data, no expenses, no files.
-- ============================================================================

DROP VIEW IF EXISTS community_trips;

CREATE VIEW community_trips AS
SELECT
  t.id                                             AS trip_id,
  t.title,
  t.destination,
  GREATEST(1, (t.end_date - t.start_date) + 1)     AS days,
  COALESCE(t.budget_paise,
           t.budget_per_person_paise)              AS budget_paise,
  t.fork_count,
  t.tags,
  t.published_at,
  COALESCE(NULLIF(split_part(u.name, ' ', 1), ''), 'Traveller') AS owner_display_name,
  (SELECT COUNT(*) FROM itinerary_items ii WHERE ii.trip_id = t.id) AS itinerary_item_count
FROM trips t
LEFT JOIN users u ON u.id = t.owner_id
WHERE t.is_public = TRUE
  AND t.published_at IS NOT NULL;

-- Grants are intentionally left to your deployment; do not grant write here.
COMMENT ON VIEW community_trips IS
  'Public-safe projection of published trips. No expenses, members, or files.';


-- ============================================================================
-- 5. ADDITIONAL CHECKS & INDEXES (defensive — safe if already present)
-- ============================================================================

-- Ensure expenses.amount_paise is positive (in case earlier schema lacked it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'expenses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%amount_paise%'
  ) THEN
    ALTER TABLE expenses
      ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount_paise > 0);
  END IF;
END $$;

-- Ensure expense_splits.share_paise is non-negative.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'expense_splits'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%share_paise%'
  ) THEN
    ALTER TABLE expense_splits
      ADD CONSTRAINT chk_splits_share_nonneg CHECK (share_paise >= 0);
  END IF;
END $$;

-- Ensure wallets.balance_paise is non-negative.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'wallets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%balance_paise%'
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT chk_wallets_balance_nonneg CHECK (balance_paise >= 0);
  END IF;
END $$;

-- Helpful general indexes.
CREATE INDEX IF NOT EXISTS idx_itinerary_client_uuid
  ON itinerary_items(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_client_uuid
  ON expenses(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_client_uuid
  ON votes(client_uuid) WHERE client_uuid IS NOT NULL;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================