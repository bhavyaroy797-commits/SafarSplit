-- ============================================================================
-- SafarSplit — Database Schema
-- Database: safarsplit
-- Currency: INR, stored as BIGINT paise (1 INR = 100 paise)
-- Re-runnable: safe to run multiple times (CREATE ... IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";        -- case-insensitive email

-- ---------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at fresh on UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email               CITEXT      NOT NULL UNIQUE,
  password_hash       TEXT        NOT NULL,
  phone               TEXT        CHECK (phone IS NULL OR phone ~ '^[0-9+\-\s]{7,15}$'),
  upi_id              TEXT        CHECK (upi_id IS NULL OR upi_id ~ '^[\w.\-]{2,}@[a-zA-Z]{2,}$'),
  dietary_preference  TEXT        NOT NULL DEFAULT 'any'
                      CHECK (dietary_preference IN ('veg','non-veg','jain','eggetarian','any')),
  preferred_language  TEXT        NOT NULL DEFAULT 'en'
                      CHECK (preferred_language IN ('en','hi','hinglish','mr','ta','te','bn','gu','kn','ml','pa')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created  ON users(created_at DESC);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 2. trips
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  destination             TEXT        NOT NULL CHECK (char_length(destination) BETWEEN 2 AND 120),
  description             TEXT,
  start_date              DATE        NOT NULL,
  end_date                DATE        NOT NULL,
  budget_paise            BIGINT      CHECK (budget_paise IS NULL OR budget_paise >= 0),
  currency                TEXT        NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  join_code               TEXT        NOT NULL UNIQUE CHECK (char_length(join_code) BETWEEN 4 AND 12),
  status                  TEXT        NOT NULL DEFAULT 'planning'
                          CHECK (status IN ('planning','ongoing','completed','cancelled')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_trips_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_trips_owner      ON trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_join_code  ON trips(join_code);
CREATE INDEX IF NOT EXISTS idx_trips_status     ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_created    ON trips(created_at DESC);

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 3. trip_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_members (
  trip_id    UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_role ON trip_members(trip_id, role);


-- ============================================================================
-- 4. itinerary_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS itinerary_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number            INT         NOT NULL CHECK (day_number BETWEEN 1 AND 60),
  position              INT         NOT NULL DEFAULT 0 CHECK (position >= 0),
  title                 TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  place                 TEXT,
  latitude              DOUBLE PRECISION CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  longitude             DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  start_time            TEXT        CHECK (start_time IS NULL OR start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  duration_minutes      INT         CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  cost_estimate_paise   BIGINT      CHECK (cost_estimate_paise IS NULL OR cost_estimate_paise >= 0),
  notes                 TEXT,
  status                TEXT        NOT NULL DEFAULT 'proposed'
                        CHECK (status IN ('proposed','confirmed','removed')),
  source                TEXT        NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','ai')),
  upvotes               INT         NOT NULL DEFAULT 0 CHECK (upvotes   >= 0),
  downvotes             INT         NOT NULL DEFAULT 0 CHECK (downvotes >= 0),
  created_by            UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_day_pos ON itinerary_items(trip_id, day_number, position);
CREATE INDEX IF NOT EXISTS idx_itinerary_status       ON itinerary_items(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_itinerary_created_by   ON itinerary_items(created_by);

DROP TRIGGER IF EXISTS trg_itinerary_updated_at ON itinerary_items;
CREATE TRIGGER trg_itinerary_updated_at
  BEFORE UPDATE ON itinerary_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 5. votes
-- ============================================================================
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES itinerary_items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       TEXT        NOT NULL CHECK (value IN ('up','down')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_item ON votes(item_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

DROP TRIGGER IF EXISTS trg_votes_updated_at ON votes;
CREATE TRIGGER trg_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 6. expenses
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_paise      BIGINT      NOT NULL CHECK (amount_paise > 0),
  description       TEXT        NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  category          TEXT        CHECK (category IS NULL OR char_length(category) <= 50),
  split_type        TEXT        NOT NULL
                    CHECK (split_type IN ('equal','exact','percentage','shares')),
  raw_text          TEXT,       -- original text if AI-parsed (Hinglish etc.)
  spent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip       ON expenses(trip_id, spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by    ON expenses(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(trip_id, category);


-- ============================================================================
-- 7. expense_splits
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense_splits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_paise   BIGINT      NOT NULL CHECK (share_paise >= 0),
  settled       BOOLEAN     NOT NULL DEFAULT FALSE,
  settled_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id),
  CONSTRAINT chk_settled_at CHECK (
    (settled = FALSE AND settled_at IS NULL) OR
    (settled = TRUE  AND settled_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user    ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_unsettled
  ON expense_splits(user_id) WHERE settled = FALSE;


-- ============================================================================
-- 8. wallets
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance_paise  BIGINT      NOT NULL DEFAULT 0 CHECK (balance_paise >= 0),
  version        INT         NOT NULL DEFAULT 0,     -- optimistic-lock counter
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 9. wallet_transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id             UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type                  TEXT        NOT NULL
                        CHECK (type IN ('credit','debit','transfer_in','transfer_out')),
  amount_paise          BIGINT      NOT NULL CHECK (amount_paise > 0),
  related_trip_id       UUID        REFERENCES trips(id)    ON DELETE SET NULL,
  related_expense_id    UUID        REFERENCES expenses(id) ON DELETE SET NULL,
  counterparty_user_id  UUID        REFERENCES users(id)    ON DELETE SET NULL,
  reference             TEXT,       -- e.g. Razorpay payment id, UPI txn ref
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet     ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_trip       ON wallet_transactions(related_trip_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_expense    ON wallet_transactions(related_expense_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference  ON wallet_transactions(reference);


-- ============================================================================
-- 10. attachments
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name  TEXT        NOT NULL CHECK (char_length(original_name) BETWEEN 1 AND 255),
  stored_name    TEXT        NOT NULL UNIQUE CHECK (char_length(stored_name) BETWEEN 1 AND 255),
  mime_type      TEXT        NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 100),
  size_bytes     BIGINT      NOT NULL CHECK (size_bytes > 0),
  kind           TEXT        NOT NULL DEFAULT 'other'
                 CHECK (kind IN ('ticket','booking','receipt','other')),
  title          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_trip     ON attachments(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON attachments(uploaded_by);


-- ============================================================================
-- 11. ai_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  trip_id        UUID        REFERENCES trips(id) ON DELETE SET NULL,
  type           TEXT        NOT NULL
                 CHECK (type IN ('generate','replan','parse_expense','explain')),
  prompt         TEXT,
  response       JSONB,
  model_name     TEXT        NOT NULL,
  provider       TEXT        NOT NULL DEFAULT 'ollama'
                 CHECK (provider IN ('ollama','openai-compatible')),
  latency_ms     INT         CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status         TEXT        NOT NULL DEFAULT 'success'
                 CHECK (status IN ('success','invalid_json','error','needs_clarification')),
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user    ON ai_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_trip    ON ai_requests(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type    ON ai_requests(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status  ON ai_requests(status);

-- ============================================================================
-- End of schema
-- ============================================================================