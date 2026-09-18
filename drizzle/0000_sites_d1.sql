PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  normalized_name TEXT NOT NULL CHECK (length(trim(normalized_name)) > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_household_active_name
ON categories (household_id, normalized_name)
WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_categories_household
ON categories (household_id, name);

CREATE TABLE IF NOT EXISTS merchant_rules (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  normalized_merchant TEXT NOT NULL CHECK (length(trim(normalized_merchant)) > 0),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (household_id, normalized_merchant)
);

CREATE INDEX IF NOT EXISTS idx_merchant_rules_household_category
ON merchant_rules (household_id, category_id);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  month TEXT NOT NULL CHECK (length(month) = 10 AND substr(month, 9, 2) = '01'),
  owner TEXT NOT NULL CHECK (owner IN ('ilya', 'masha', 'mutual')),
  total_limit_satang INTEGER NOT NULL CHECK (total_limit_satang >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (household_id, month, owner)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_household_month
ON monthly_budgets (household_id, month);

CREATE TABLE IF NOT EXISTS budget_category_limits (
  monthly_budget_id TEXT NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  limit_satang INTEGER NOT NULL CHECK (limit_satang >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (monthly_budget_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_category_limits_category
ON budget_category_limits (category_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
  expense_date TEXT NOT NULL CHECK (length(expense_date) = 10),
  merchant TEXT NOT NULL CHECK (length(trim(merchant)) > 0),
  normalized_merchant TEXT NOT NULL CHECK (length(trim(normalized_merchant)) > 0),
  notes TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  owner TEXT NOT NULL CHECK (owner IN ('ilya', 'masha', 'mutual')),
  paid_from TEXT NOT NULL CHECK (paid_from IN ('ilya', 'masha', 'mutual')),
  ilya_share_bps INTEGER NOT NULL CHECK (ilya_share_bps BETWEEN 0 AND 10000),
  capture_method TEXT NOT NULL DEFAULT 'manual' CHECK (capture_method IN ('manual', 'text', 'voice', 'receipt')),
  usd_per_thb REAL CHECK (usd_per_thb IS NULL OR usd_per_thb > 0),
  ils_per_thb REAL CHECK (ils_per_thb IS NULL OR ils_per_thb > 0),
  duplicate_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_confirmed IN (0, 1)),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (owner = 'mutual' OR (owner = 'ilya' AND ilya_share_bps = 10000) OR (owner = 'masha' AND ilya_share_bps = 0))
);

CREATE INDEX IF NOT EXISTS idx_expenses_household_date
ON expenses (household_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_household_category_date
ON expenses (household_id, category_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_duplicate
ON expenses (household_id, expense_date, amount_satang, normalized_merchant);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  from_person TEXT NOT NULL CHECK (from_person IN ('ilya', 'masha')),
  to_person TEXT NOT NULL CHECK (to_person IN ('ilya', 'masha')),
  amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
  settlement_date TEXT NOT NULL CHECK (length(settlement_date) = 10),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (from_person <> to_person)
);

CREATE INDEX IF NOT EXISTS idx_settlements_household_date
ON settlements (household_id, settlement_date DESC);

CREATE TABLE IF NOT EXISTS exchange_rates (
  rate_date TEXT PRIMARY KEY CHECK (length(rate_date) = 10),
  usd_per_thb REAL NOT NULL CHECK (usd_per_thb > 0),
  ils_per_thb REAL NOT NULL CHECK (ils_per_thb > 0),
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO categories (id, household_id, name, normalized_name) VALUES
  ('category-groceries', 'thailand-household', 'Продукты', 'продукты'),
  ('category-restaurants', 'thailand-household', 'Кафе и рестораны', 'кафе и рестораны'),
  ('category-transport', 'thailand-household', 'Транспорт', 'транспорт'),
  ('category-home', 'thailand-household', 'Дом', 'дом'),
  ('category-health', 'thailand-household', 'Здоровье', 'здоровье'),
  ('category-connectivity', 'thailand-household', 'Связь', 'связь'),
  ('category-entertainment', 'thailand-household', 'Развлечения', 'развлечения'),
  ('category-other', 'thailand-household', 'Прочее', 'прочее');

PRAGMA optimize;
