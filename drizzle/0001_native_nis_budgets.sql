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

INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 280000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'жильё' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 40000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'коммуналка + интернет' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 50000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'байк' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 15000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'бензин' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 100000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'продукты домой' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 130000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'кафе / рестораны / доставка' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 35000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'кофе' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 40000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = '7-eleven / снеки / напитки' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 120000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'спорт+хобби' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 30000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'массажи / recovery' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 50000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'развлечения / активности' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 15000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'grab / такси' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 10000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'sim' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 25000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'быт / laundry' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 35000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'страховки' AND is_active = 1 LIMIT 1;
INSERT INTO budget_category_limits SELECT 'thailand-household:' || date('now', '+7 hours', 'start of month') || ':mutual', id, 25000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM categories WHERE household_id = 'thailand-household' AND normalized_name = 'буфер' AND is_active = 1 LIMIT 1;

PRAGMA optimize;
