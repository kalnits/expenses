ALTER TABLE expenses
ADD COLUMN original_currency TEXT NOT NULL DEFAULT 'THB'
CHECK (original_currency IN ('THB', 'ILS', 'USD'));

ALTER TABLE expenses
ADD COLUMN original_amount_minor INTEGER NOT NULL DEFAULT 1
CHECK (original_amount_minor > 0);

UPDATE expenses
SET original_amount_minor = amount_satang,
    original_currency = 'THB';

INSERT INTO monthly_budgets
  (id, household_id, month, owner, currency, total_limit_satang)
VALUES (
  'thailand-household:2026-09-01:mutual',
  'thailand-household', '2026-09-01', 'mutual', 'ILS', 500000
)
ON CONFLICT (household_id, month, owner) DO UPDATE SET
  currency = 'ILS', total_limit_satang = 500000,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

DELETE FROM budget_category_limits
WHERE monthly_budget_id = 'thailand-household:2026-09-01:mutual';

INSERT INTO budget_category_limits (monthly_budget_id, category_id, limit_satang) VALUES
  ('thailand-household:2026-09-01:mutual', 'category-housing', 140000),
  ('thailand-household:2026-09-01:mutual', 'category-utilities', 20000),
  ('thailand-household:2026-09-01:mutual', 'category-bike', 25000),
  ('thailand-household:2026-09-01:mutual', 'category-fuel', 7500),
  ('thailand-household:2026-09-01:mutual', 'category-home-groceries', 50000),
  ('thailand-household:2026-09-01:mutual', 'category-food-out', 65000),
  ('thailand-household:2026-09-01:mutual', 'category-coffee', 17500),
  ('thailand-household:2026-09-01:mutual', 'category-convenience', 20000),
  ('thailand-household:2026-09-01:mutual', 'category-sport-hobbies', 60000),
  ('thailand-household:2026-09-01:mutual', 'category-recovery', 15000),
  ('thailand-household:2026-09-01:mutual', 'category-activities', 25000),
  ('thailand-household:2026-09-01:mutual', 'category-taxi', 7500),
  ('thailand-household:2026-09-01:mutual', 'category-sim', 5000),
  ('thailand-household:2026-09-01:mutual', 'category-household', 12500),
  ('thailand-household:2026-09-01:mutual', 'category-insurance', 17500),
  ('thailand-household:2026-09-01:mutual', 'category-buffer', 12500);

PRAGMA optimize;
