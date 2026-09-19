ALTER TABLE monthly_budgets
ADD COLUMN currency TEXT NOT NULL DEFAULT 'THB' CHECK (currency IN ('THB', 'ILS'));

UPDATE categories
SET is_active = 0
WHERE household_id = 'thailand-household'
  AND id IN (
    'category-groceries', 'category-restaurants', 'category-transport',
    'category-home', 'category-health', 'category-connectivity',
    'category-entertainment', 'category-other'
  );

INSERT OR IGNORE INTO categories (id, household_id, name, normalized_name) VALUES
  ('category-housing', 'thailand-household', 'Жильё', 'жильё'),
  ('category-utilities', 'thailand-household', 'Коммуналка + интернет', 'коммуналка + интернет'),
  ('category-bike', 'thailand-household', 'Байк', 'байк'),
  ('category-fuel', 'thailand-household', 'Бензин', 'бензин'),
  ('category-home-groceries', 'thailand-household', 'Продукты домой', 'продукты домой'),
  ('category-food-out', 'thailand-household', 'Кафе / рестораны / доставка', 'кафе / рестораны / доставка'),
  ('category-coffee', 'thailand-household', 'Кофе', 'кофе'),
  ('category-convenience', 'thailand-household', '7-Eleven / снеки / напитки', '7-eleven / снеки / напитки'),
  ('category-sport-hobbies', 'thailand-household', 'Спорт+хобби', 'спорт+хобби'),
  ('category-recovery', 'thailand-household', 'Массажи / recovery', 'массажи / recovery'),
  ('category-activities', 'thailand-household', 'Развлечения / активности', 'развлечения / активности'),
  ('category-taxi', 'thailand-household', 'Grab / такси', 'grab / такси'),
  ('category-sim', 'thailand-household', 'SIM', 'sim'),
  ('category-household', 'thailand-household', 'Быт / laundry', 'быт / laundry'),
  ('category-insurance', 'thailand-household', 'Страховки', 'страховки'),
  ('category-buffer', 'thailand-household', 'Буфер', 'буфер');

INSERT INTO monthly_budgets
  (id, household_id, month, owner, currency, total_limit_satang)
VALUES (
  'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual',
  'thailand-household', date('now', '+7 hours', 'start of month'), 'mutual', 'ILS', 1000000
)
ON CONFLICT (household_id, month, owner) DO UPDATE SET
  currency = 'ILS', total_limit_satang = 1000000,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

DELETE FROM budget_category_limits
WHERE monthly_budget_id = 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual';

INSERT INTO budget_category_limits (monthly_budget_id, category_id, limit_satang)
SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, amount_minor
FROM categories
JOIN (
  SELECT 'жильё' AS normalized_name, 280000 AS amount_minor UNION ALL
  SELECT 'коммуналка + интернет', 40000 UNION ALL
  SELECT 'байк', 50000 UNION ALL
  SELECT 'бензин', 15000 UNION ALL
  SELECT 'продукты домой', 100000 UNION ALL
  SELECT 'кафе / рестораны / доставка', 130000 UNION ALL
  SELECT 'кофе', 35000 UNION ALL
  SELECT '7-eleven / снеки / напитки', 40000 UNION ALL
  SELECT 'спорт+хобби', 120000 UNION ALL
  SELECT 'массажи / recovery', 30000 UNION ALL
  SELECT 'развлечения / активности', 50000 UNION ALL
  SELECT 'grab / такси', 15000 UNION ALL
  SELECT 'sim', 10000 UNION ALL
  SELECT 'быт / laundry', 25000 UNION ALL
  SELECT 'страховки', 35000 UNION ALL
  SELECT 'буфер', 25000
) defaults USING (normalized_name)
WHERE categories.household_id = 'thailand-household' AND categories.is_active = 1;

PRAGMA optimize;
