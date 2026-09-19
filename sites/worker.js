/* global AbortController, DOMException, File, FormData, Request, Response, URL, btoa, clearTimeout, crypto, fetch, setTimeout */

const HOUSEHOLD_ID = 'thailand-household'
const DEFAULT_ILYA_EMAIL = 'kalnit2308@gmail.com'
const DEFAULT_STRUCTURED_MODEL = 'gpt-4.1-mini'
const DEFAULT_TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe'
const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}
const PEOPLE = new Set(['ilya', 'masha'])
const OWNERS = new Set(['ilya', 'masha', 'mutual'])
const BUDGET_CURRENCIES = new Set(['THB', 'ILS'])
const CAPTURE_METHODS = new Set(['manual', 'text', 'voice', 'receipt'])
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK (length(trim(normalized_name)) > 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_household_active_name
    ON categories (household_id, normalized_name) WHERE is_active = 1`,
  `CREATE INDEX IF NOT EXISTS idx_categories_household
    ON categories (household_id, name)`,
  `CREATE TABLE IF NOT EXISTS merchant_rules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    normalized_merchant TEXT NOT NULL CHECK (length(trim(normalized_merchant)) > 0),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (household_id, normalized_merchant)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_merchant_rules_household_category
    ON merchant_rules (household_id, category_id)`,
  `CREATE TABLE IF NOT EXISTS monthly_budgets (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    month TEXT NOT NULL CHECK (length(month) = 10 AND substr(month, 9, 2) = '01'),
    owner TEXT NOT NULL CHECK (owner IN ('ilya', 'masha', 'mutual')),
    currency TEXT NOT NULL DEFAULT 'THB' CHECK (currency IN ('THB', 'ILS')),
    total_limit_satang INTEGER NOT NULL CHECK (total_limit_satang >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (household_id, month, owner)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_monthly_budgets_household_month
    ON monthly_budgets (household_id, month)`,
  `CREATE TABLE IF NOT EXISTS budget_category_limits (
    monthly_budget_id TEXT NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    limit_satang INTEGER NOT NULL CHECK (limit_satang >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (monthly_budget_id, category_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_budget_category_limits_category
    ON budget_category_limits (category_id)`,
  `CREATE TABLE IF NOT EXISTS expenses (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_household_date
    ON expenses (household_id, expense_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_household_category_date
    ON expenses (household_id, category_id, expense_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_duplicate
    ON expenses (household_id, expense_date, amount_satang, normalized_merchant)`,
  `CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    from_person TEXT NOT NULL CHECK (from_person IN ('ilya', 'masha')),
    to_person TEXT NOT NULL CHECK (to_person IN ('ilya', 'masha')),
    amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
    settlement_date TEXT NOT NULL CHECK (length(settlement_date) = 10),
    created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (from_person <> to_person)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_settlements_household_date
    ON settlements (household_id, settlement_date DESC)`,
  `CREATE TABLE IF NOT EXISTS exchange_rates (
    rate_date TEXT PRIMARY KEY CHECK (length(rate_date) = 10),
    usd_per_thb REAL NOT NULL CHECK (usd_per_thb > 0),
    ils_per_thb REAL NOT NULL CHECK (ils_per_thb > 0),
    fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `INSERT OR IGNORE INTO categories (id, household_id, name, normalized_name) VALUES
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
    ('category-buffer', 'thailand-household', 'Буфер', 'буфер')`,
  'PRAGMA optimize',
]

const EXPENSE_SELECT = `SELECT id, household_id, amount_satang, capture_method,
  category_id, created_at, created_by, duplicate_confirmed, expense_date,
  ils_per_thb, ilya_share_bps, merchant, normalized_merchant, notes, owner,
  paid_from, usd_per_thb FROM expenses`

let initialization

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.extra = extra
  }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS })
}

function errorResponse(error) {
  if (error instanceof HttpError) return json({ error: error.message, ...error.extra }, error.status)
  const message = error instanceof Error ? error.message : ''
  if (message.includes('UNIQUE constraint failed')) return json({ error: 'Такая запись уже существует.' }, 409)
  if (message.includes('FOREIGN KEY constraint failed')) return json({ error: 'Связанная запись не найдена.' }, 409)
  if (message.includes('CHECK constraint failed')) return json({ error: 'Проверьте введённые значения.' }, 400)
  return json({ error: 'Не удалось выполнить запрос. Попробуйте снова.' }, 500)
}

function normalizedEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function authorize(request, env) {
  const userId = request.headers.get('oai-authenticated-user-id')?.trim()
  const email = normalizedEmail(request.headers.get('oai-authenticated-user-email'))
  if (!userId || !email) throw new HttpError(401, 'Откройте приватный сайт через OpenAI и войдите в аккаунт.')

  const ilyaEmail = normalizedEmail(env.ILYA_EMAIL) || DEFAULT_ILYA_EMAIL
  const mashaEmail = normalizedEmail(env.MASHA_EMAIL)
  if (email === ilyaEmail) return { email, person: 'ilya', userId }
  if (mashaEmail && email === mashaEmail) return { email, person: 'masha', userId }
  throw new HttpError(403, 'Этот аккаунт не добавлен в семейный бюджет.')
}

async function initializeDatabase(db) {
  if (!initialization) {
    initialization = db.batch(SCHEMA_STATEMENTS.map((statement) => db.prepare(statement)))
      .catch((error) => {
        initialization = undefined
        throw error
      })
  }
  await initialization
}

async function readJson(request) {
  const value = await request.json().catch(() => null)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Тело запроса должно быть объектом JSON.')
  }
  return value
}

function requiredString(value, message, maximum = 500) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new HttpError(400, message)
  }
  return value.trim()
}

function requiredInteger(value, message, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new HttpError(400, message)
  }
  return value
}

function isExactDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function requireDate(value, message = 'Укажите дату в формате ГГГГ-ММ-ДД.') {
  if (!isExactDate(value)) throw new HttpError(400, message)
  return value
}

function requireMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new HttpError(400, 'Месяц должен быть в формате ГГГГ-ММ.')
  }
  return `${value}-01`
}

function normalizeName(value) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function normalizeMerchant(value) {
  return value.trim().toLocaleLowerCase('ru-RU')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CATEGORY_HINTS = [
  { name: 'Спорт+хобби', terms: ['padel', 'paddle', 'падел', 'теннис', 'tournament', 'турнир', 'gym', 'fitness', 'спорт', 'йога', 'хобби'] },
  { name: 'Кофе', terms: ['coffee', 'кофе', 'starbucks', 'amazon cafe'] },
  { name: 'Массажи / recovery', terms: ['massage', 'массаж', 'recovery', 'spa', 'спа'] },
  { name: 'Grab / такси', terms: ['taxi', 'такси', 'grab ride', 'bolt', 'indrive'] },
  { name: '7-Eleven / снеки / напитки', terms: ['7 eleven', 'seven eleven', 'снеки', 'snack', 'напитки'] },
  { name: 'Бензин', terms: ['fuel', 'petrol', 'gasoline', 'бензин', 'заправка'] },
  { name: 'SIM', terms: ['sim', 'dtac', 'ais', 'mobile plan', 'мобильная связь'] },
  { name: 'Страховки', terms: ['insurance', 'страховка', 'страхование'] },
  { name: 'Коммуналка + интернет', terms: ['utilities', 'коммунал', 'electricity', 'электричество', 'internet', 'интернет', 'water bill'] },
  { name: 'Жильё', terms: ['rent', 'аренда', 'condo', 'кондо', 'жильё', 'жилье'] },
  { name: 'Байк', terms: ['motorbike', 'scooter rental', 'аренда байка', 'байк'] },
  { name: 'Быт / laundry', terms: ['laundry', 'прачечная', 'стирка', 'cleaning', 'уборка'] },
  { name: 'Продукты домой', terms: ['groceries', 'продукты', 'lotus', 'big c', 'makro', 'supermarket', 'супермаркет'] },
  { name: 'Кафе / рестораны / доставка', terms: ['restaurant', 'ресторан', 'кафе', 'delivery', 'доставка', 'foodpanda', 'grab food'] },
  { name: 'Развлечения / активности', terms: ['cinema', 'кино', 'concert', 'концерт', 'экскурсия', 'activity', 'активность'] },
]

function hintedCategory(categories, text) {
  const haystack = normalizeMerchant(text)
  const hint = CATEGORY_HINTS.find((candidate) => candidate.terms.some((term) => haystack.includes(normalizeMerchant(term))))
  return hint ? categories.find((category) => normalizeName(category.name) === normalizeName(hint.name)) : undefined
}

function mapCategory(row) {
  return {
    id: row.id,
    isActive: Boolean(row.is_active),
    name: row.name,
    normalizedName: row.normalized_name,
  }
}

function mapExpense(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    amountSatang: row.amount_satang,
    captureMethod: row.capture_method,
    categoryId: row.category_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    duplicateConfirmed: Boolean(row.duplicate_confirmed),
    expenseDate: row.expense_date,
    ilsPerThb: row.ils_per_thb,
    ilyaShareBps: row.ilya_share_bps,
    merchant: row.merchant,
    normalizedMerchant: row.normalized_merchant,
    notes: row.notes,
    owner: row.owner,
    paidFrom: row.paid_from,
    usdPerThb: row.usd_per_thb,
  }
}

function mapSettlement(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    from: row.from_person,
    to: row.to_person,
    amountSatang: row.amount_satang,
    settlementDate: row.settlement_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function validateExpense(value) {
  const owner = OWNERS.has(value.owner) ? value.owner : null
  const paidFrom = OWNERS.has(value.paidFrom) ? value.paidFrom : null
  const captureMethod = CAPTURE_METHODS.has(value.captureMethod) ? value.captureMethod : null
  const merchant = requiredString(value.merchant, 'Укажите магазин или место.')
  const categoryId = requiredString(value.categoryId, 'Выберите категорию.')
  const amountSatang = requiredInteger(value.amountSatang, 'Сумма должна быть положительным числом сатангов.', 1)
  const ilyaShareBps = requiredInteger(value.ilyaShareBps, 'Проверьте долю Ильи.', 0, 10_000)
  if (!owner || !paidFrom || !captureMethod) throw new HttpError(400, 'Проверьте владельца, счёт и способ добавления расхода.')
  if ((owner === 'ilya' && ilyaShareBps !== 10_000) || (owner === 'masha' && ilyaShareBps !== 0)) {
    throw new HttpError(400, 'Личная трата должна полностью принадлежать выбранному владельцу.')
  }
  return {
    amountSatang,
    captureMethod,
    categoryId,
    duplicateConfirmed: Boolean(value.duplicateConfirmed),
    expenseDate: requireDate(value.expenseDate),
    ilyaShareBps,
    merchant,
    normalizedMerchant: normalizeMerchant(merchant),
    notes: typeof value.notes === 'string' && value.notes.trim() ? value.notes.trim().slice(0, 4000) : null,
    owner,
    paidFrom,
  }
}

async function ensureCategory(db, categoryId, activeOnly = false) {
  const row = await db.prepare(`SELECT id FROM categories
    WHERE household_id = ? AND id = ?${activeOnly ? ' AND is_active = 1' : ''}`)
    .bind(HOUSEHOLD_ID, categoryId).first()
  if (!row) throw new HttpError(400, 'Выбранная категория не найдена.')
}

async function handleCategories(request, db, url) {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 2 && request.method === 'GET') {
    const result = await db.prepare(`SELECT id, name, normalized_name, is_active
      FROM categories WHERE household_id = ? ORDER BY name COLLATE NOCASE`)
      .bind(HOUSEHOLD_ID).all()
    return json(result.results.map(mapCategory))
  }
  if (segments.length === 2 && request.method === 'POST') {
    const body = await readJson(request)
    const name = requiredString(body.name, 'Введите название категории.', 100)
    await db.prepare(`INSERT INTO categories
      (id, household_id, name, normalized_name) VALUES (?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), HOUSEHOLD_ID, name, normalizeName(name)).run()
    return json({}, 201)
  }
  const categoryId = decodeURIComponent(segments[2] || '')
  if (!categoryId) throw new HttpError(404, 'Маршрут не найден.')
  if (segments.length === 3 && request.method === 'PATCH') {
    const body = await readJson(request)
    if (body.name !== undefined) {
      const name = requiredString(body.name, 'Введите название категории.', 100)
      const result = await db.prepare(`UPDATE categories
        SET name = ?, normalized_name = ? WHERE household_id = ? AND id = ?`)
        .bind(name, normalizeName(name), HOUSEHOLD_ID, categoryId).run()
      if (!result.meta.changes) throw new HttpError(404, 'Категория не найдена.')
    } else if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') throw new HttpError(400, 'Неверный статус категории.')
      if (!body.isActive) {
        const count = await db.prepare(`SELECT count(*) AS count FROM categories
          WHERE household_id = ? AND is_active = 1`).bind(HOUSEHOLD_ID).first()
        if ((count?.count ?? 0) <= 1) throw new HttpError(409, 'Нельзя отключить последнюю активную категорию.')
      }
      const result = await db.prepare(`UPDATE categories SET is_active = ?
        WHERE household_id = ? AND id = ?`).bind(body.isActive ? 1 : 0, HOUSEHOLD_ID, categoryId).run()
      if (!result.meta.changes) throw new HttpError(404, 'Категория не найдена.')
    } else throw new HttpError(400, 'Не указано изменение категории.')
    return json({})
  }
  if (segments.length === 4 && segments[3] === 'merge' && request.method === 'POST') {
    const body = await readJson(request)
    const targetId = requiredString(body.targetId, 'Выберите категорию назначения.')
    if (categoryId === targetId) throw new HttpError(400, 'Категории должны отличаться.')
    const rows = await db.prepare(`SELECT id, is_active FROM categories
      WHERE household_id = ? AND id IN (?, ?)`).bind(HOUSEHOLD_ID, categoryId, targetId).all()
    const source = rows.results.find((row) => row.id === categoryId)
    const target = rows.results.find((row) => row.id === targetId)
    if (!source || !target || !target.is_active) throw new HttpError(400, 'Категории не найдены или категория назначения отключена.')
    await db.batch([
      db.prepare('UPDATE expenses SET category_id = ? WHERE household_id = ? AND category_id = ?').bind(targetId, HOUSEHOLD_ID, categoryId),
      db.prepare(`DELETE FROM merchant_rules WHERE household_id = ? AND category_id = ?
        AND normalized_merchant IN (SELECT normalized_merchant FROM merchant_rules WHERE household_id = ? AND category_id = ?)`)
        .bind(HOUSEHOLD_ID, categoryId, HOUSEHOLD_ID, targetId),
      db.prepare('UPDATE merchant_rules SET category_id = ?, updated_at = ? WHERE household_id = ? AND category_id = ?')
        .bind(targetId, new Date().toISOString(), HOUSEHOLD_ID, categoryId),
      db.prepare(`INSERT INTO budget_category_limits (monthly_budget_id, category_id, limit_satang)
        SELECT monthly_budget_id, ?, limit_satang FROM budget_category_limits WHERE category_id = ?
        ON CONFLICT (monthly_budget_id, category_id) DO UPDATE SET limit_satang = limit_satang + excluded.limit_satang`)
        .bind(targetId, categoryId),
      db.prepare('DELETE FROM budget_category_limits WHERE category_id = ?').bind(categoryId),
      db.prepare('UPDATE categories SET is_active = 0 WHERE household_id = ? AND id = ?').bind(HOUSEHOLD_ID, categoryId),
    ])
    return json({})
  }
  throw new HttpError(404, 'Маршрут не найден.')
}

async function handleMerchantRules(request, db) {
  if (request.method !== 'PUT') throw new HttpError(405, 'Метод не поддерживается.')
  const body = await readJson(request)
  const normalizedMerchant = normalizeMerchant(requiredString(body.normalizedMerchant, 'Укажите магазин.'))
  const categoryId = requiredString(body.categoryId, 'Выберите категорию.')
  await ensureCategory(db, categoryId, true)
  await db.prepare(`INSERT INTO merchant_rules
    (id, household_id, normalized_merchant, category_id) VALUES (?, ?, ?, ?)
    ON CONFLICT (household_id, normalized_merchant) DO UPDATE SET
      category_id = excluded.category_id, updated_at = excluded.created_at`)
    .bind(crypto.randomUUID(), HOUSEHOLD_ID, normalizedMerchant, categoryId).run()
  return json({})
}

async function expenseById(db, id) {
  const row = await db.prepare(`${EXPENSE_SELECT} WHERE household_id = ? AND id = ?`)
    .bind(HOUSEHOLD_ID, id).first()
  if (!row) throw new HttpError(404, 'Расход не найден.')
  return row
}

async function handleExpenses(request, db, identity, url) {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 2 && request.method === 'GET') {
    const result = await db.prepare(`${EXPENSE_SELECT}
      WHERE household_id = ? ORDER BY expense_date DESC, created_at DESC`)
      .bind(HOUSEHOLD_ID).all()
    return json(result.results.map(mapExpense))
  }
  if (segments.length === 3 && segments[2] === 'duplicate' && request.method === 'GET') {
    const expenseDate = requireDate(url.searchParams.get('date'))
    const amountSatang = requiredInteger(Number(url.searchParams.get('amountSatang')), 'Проверьте сумму.', 1)
    const merchant = normalizeMerchant(url.searchParams.get('merchant') || '')
    if (!merchant) return json(null)
    const row = await db.prepare(`${EXPENSE_SELECT} WHERE household_id = ?
      AND expense_date = ? AND amount_satang = ? AND normalized_merchant = ?
      ORDER BY created_at DESC LIMIT 1`).bind(HOUSEHOLD_ID, expenseDate, amountSatang, merchant).first()
    return json(row ? mapExpense(row) : null)
  }
  if (segments.length === 2 && request.method === 'POST') {
    const input = validateExpense(await readJson(request))
    await ensureCategory(db, input.categoryId)
    const id = crypto.randomUUID()
    await db.prepare(`INSERT INTO expenses
      (id, household_id, amount_satang, capture_method, category_id, created_by,
       duplicate_confirmed, expense_date, ilya_share_bps, merchant,
       normalized_merchant, notes, owner, paid_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, HOUSEHOLD_ID, input.amountSatang, input.captureMethod, input.categoryId,
        identity.userId, input.duplicateConfirmed ? 1 : 0, input.expenseDate,
        input.ilyaShareBps, input.merchant, input.normalizedMerchant, input.notes,
        input.owner, input.paidFrom).run()
    return json(mapExpense(await expenseById(db, id)), 201)
  }
  const id = decodeURIComponent(segments[2] || '')
  if (!id || segments.length !== 3) throw new HttpError(404, 'Маршрут не найден.')
  if (request.method === 'PATCH') {
    const current = mapExpense(await expenseById(db, id))
    const body = await readJson(request)
    const input = validateExpense({ ...current, ...body })
    await ensureCategory(db, input.categoryId)
    await db.prepare(`UPDATE expenses SET amount_satang = ?, capture_method = ?,
      category_id = ?, duplicate_confirmed = ?, expense_date = ?, ilya_share_bps = ?,
      merchant = ?, normalized_merchant = ?, notes = ?, owner = ?, paid_from = ?,
      usd_per_thb = ?, ils_per_thb = ?, updated_at = ?
      WHERE household_id = ? AND id = ?`)
      .bind(input.amountSatang, input.captureMethod, input.categoryId,
        input.duplicateConfirmed ? 1 : 0, input.expenseDate, input.ilyaShareBps,
        input.merchant, input.normalizedMerchant, input.notes, input.owner,
        input.paidFrom, positiveNumberOrNull(body.usdPerThb),
        positiveNumberOrNull(body.ilsPerThb), new Date().toISOString(), HOUSEHOLD_ID, id).run()
    return json(mapExpense(await expenseById(db, id)))
  }
  if (request.method === 'DELETE') {
    const result = await db.prepare('DELETE FROM expenses WHERE household_id = ? AND id = ?')
      .bind(HOUSEHOLD_ID, id).run()
    if (!result.meta.changes) throw new HttpError(404, 'Расход не найден.')
    return json({})
  }
  throw new HttpError(405, 'Метод не поддерживается.')
}

function positiveNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function budgetId(month, owner) {
  return `${HOUSEHOLD_ID}:${month}:${owner}`
}

function validateBudget(body) {
  const month = requireMonth(body.month)
  if (!OWNERS.has(body.owner)) throw new HttpError(400, 'Выберите владельца бюджета.')
  const currency = body.currency ?? 'THB'
  if (!BUDGET_CURRENCIES.has(currency)) throw new HttpError(400, 'Выберите валюту бюджета.')
  const totalLimitSatang = requiredInteger(body.totalLimitSatang, 'Проверьте общий лимит.')
  const categoryLimits = Array.isArray(body.categoryLimits) ? body.categoryLimits.map((limit) => ({
    categoryId: requiredString(limit?.categoryId, 'Выберите категорию лимита.'),
    limitSatang: requiredInteger(limit?.limitSatang, 'Проверьте лимит категории.'),
  })) : []
  if (new Set(categoryLimits.map((limit) => limit.categoryId)).size !== categoryLimits.length) {
    throw new HttpError(400, 'Категории лимитов не должны повторяться.')
  }
  return { categoryLimits, currency, month, owner: body.owner, totalLimitSatang }
}

async function handleBudgets(request, db) {
  if (request.method === 'GET') {
    const [budgetResult, limitResult] = await Promise.all([
      db.prepare(`SELECT id, month, owner, currency, total_limit_satang FROM monthly_budgets
        WHERE household_id = ? ORDER BY month, owner`).bind(HOUSEHOLD_ID).all(),
      db.prepare(`SELECT l.monthly_budget_id, l.category_id, l.limit_satang
        FROM budget_category_limits l JOIN monthly_budgets b ON b.id = l.monthly_budget_id
        WHERE b.household_id = ? ORDER BY l.category_id`).bind(HOUSEHOLD_ID).all(),
    ])
    return json(budgetResult.results.map((row) => ({
      month: row.month.slice(0, 7),
      owner: row.owner,
      currency: row.currency,
      totalLimitSatang: row.total_limit_satang,
      categoryLimits: limitResult.results.filter((limit) => limit.monthly_budget_id === row.id)
        .map((limit) => ({ categoryId: limit.category_id, limitSatang: limit.limit_satang })),
    })))
  }
  if (request.method === 'PUT') {
    const budget = validateBudget(await readJson(request))
    for (const limit of budget.categoryLimits) await ensureCategory(db, limit.categoryId, true)
    const id = budgetId(budget.month, budget.owner)
    const now = new Date().toISOString()
    const statements = [
      db.prepare(`INSERT INTO monthly_budgets
        (id, household_id, month, owner, currency, total_limit_satang) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (household_id, month, owner) DO UPDATE SET
          currency = excluded.currency, total_limit_satang = excluded.total_limit_satang, updated_at = ?`)
        .bind(id, HOUSEHOLD_ID, budget.month, budget.owner, budget.currency, budget.totalLimitSatang, now),
      db.prepare('DELETE FROM budget_category_limits WHERE monthly_budget_id = ?').bind(id),
      ...budget.categoryLimits.map((limit) => db.prepare(`INSERT INTO budget_category_limits
        (monthly_budget_id, category_id, limit_satang) VALUES (?, ?, ?)`)
        .bind(id, limit.categoryId, limit.limitSatang)),
    ]
    await db.batch(statements)
    return json({})
  }
  throw new HttpError(405, 'Метод не поддерживается.')
}

async function handleSettlements(request, db, identity) {
  if (request.method === 'GET') {
    const result = await db.prepare(`SELECT id, household_id, from_person, to_person,
      amount_satang, settlement_date, created_by, created_at FROM settlements
      WHERE household_id = ? ORDER BY settlement_date DESC, created_at DESC`)
      .bind(HOUSEHOLD_ID).all()
    return json(result.results.map(mapSettlement))
  }
  if (request.method === 'POST') {
    const body = await readJson(request)
    if (!PEOPLE.has(body.from) || !PEOPLE.has(body.to) || body.from === body.to) {
      throw new HttpError(400, 'Отправитель и получатель должны отличаться.')
    }
    const amountSatang = requiredInteger(body.amountSatang, 'Введите положительную сумму в батах.', 1)
    const settlementDate = requireDate(body.settlementDate)
    const id = crypto.randomUUID()
    await db.prepare(`INSERT INTO settlements
      (id, household_id, from_person, to_person, amount_satang, settlement_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, HOUSEHOLD_ID, body.from, body.to, amountSatang, settlementDate, identity.userId).run()
    const row = await db.prepare(`SELECT id, household_id, from_person, to_person,
      amount_satang, settlement_date, created_by, created_at FROM settlements WHERE id = ?`)
      .bind(id).first()
    return json(mapSettlement(row), 201)
  }
  throw new HttpError(405, 'Метод не поддерживается.')
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchExactRate(date) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/thb.min.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/thb.min.json`,
  ]
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 8_000)
      if (!response.ok) continue
      const payload = await response.json()
      const usdPerThb = positiveNumberOrNull(payload?.thb?.usd)
      const ilsPerThb = positiveNumberOrNull(payload?.thb?.ils)
      if (payload?.date === date && usdPerThb && ilsPerThb) {
        return { rateDate: date, usdPerThb, ilsPerThb }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) continue
    }
  }
  throw new HttpError(502, 'Курс за выбранную дату недоступен.')
}

async function handleRates(request, db, url) {
  if (request.method !== 'GET') throw new HttpError(405, 'Метод не поддерживается.')
  const date = requireDate(url.searchParams.get('date'))
  const expenseId = url.searchParams.get('expenseId')?.trim()
  let row = await db.prepare(`SELECT rate_date, usd_per_thb, ils_per_thb
    FROM exchange_rates WHERE rate_date = ?`).bind(date).first()
  let rate
  if (row) {
    rate = { rateDate: row.rate_date, usdPerThb: row.usd_per_thb, ilsPerThb: row.ils_per_thb }
  } else {
    rate = await fetchExactRate(date)
    await db.prepare(`INSERT INTO exchange_rates
      (rate_date, usd_per_thb, ils_per_thb) VALUES (?, ?, ?)
      ON CONFLICT (rate_date) DO UPDATE SET usd_per_thb = excluded.usd_per_thb,
        ils_per_thb = excluded.ils_per_thb, fetched_at = ?`)
      .bind(date, rate.usdPerThb, rate.ilsPerThb, new Date().toISOString()).run()
  }
  if (expenseId) {
    row = await db.prepare('SELECT expense_date FROM expenses WHERE household_id = ? AND id = ?')
      .bind(HOUSEHOLD_ID, expenseId).first()
    if (!row) throw new HttpError(404, 'Расход не найден.')
    if (row.expense_date !== date) throw new HttpError(400, 'Дата расхода не совпадает с датой курса.')
    await db.prepare(`UPDATE expenses SET usd_per_thb = ?, ils_per_thb = ?, updated_at = ?
      WHERE household_id = ? AND id = ?`).bind(rate.usdPerThb, rate.ilsPerThb,
      new Date().toISOString(), HOUSEHOLD_ID, expenseId).run()
  }
  return json(rate)
}

function openAIKey(env) {
  const value = env.OPENAI_API_KEY?.trim()
  if (!value) throw new HttpError(503, 'Распознавание пока не настроено. Заполните расход вручную.')
  return value
}

async function openAI(env, path, init) {
  let response
  try {
    response = await fetchWithTimeout(`https://api.openai.com/v1/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${openAIKey(env)}`, ...init.headers },
    }, 30_000)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(504, 'Распознавание заняло слишком много времени.')
    }
    throw new HttpError(502, 'Сервис распознавания временно недоступен.')
  }
  if (!response.ok) {
    throw new HttpError(response.status === 429 ? 429 : 502,
      response.status === 429 ? 'Сервис распознавания перегружен. Попробуйте позже.' : 'Сервис распознавания временно недоступен.')
  }
  return response
}

const EXPENSE_CAPTURE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['amountSatang', 'expenseDate', 'merchant', 'notes', 'categoryId', 'owner', 'paidFrom', 'ilyaShareBps', 'confidence', 'warnings'],
  properties: {
    amountSatang: { type: 'integer', minimum: 0 },
    expenseDate: { type: 'string', format: 'date' },
    merchant: { type: 'string' },
    notes: { type: 'string' },
    categoryId: { type: 'string' },
    owner: { type: 'string', enum: ['ilya', 'masha', 'mutual'] },
    paidFrom: { type: 'string', enum: ['ilya', 'masha', 'mutual'] },
    ilyaShareBps: { type: 'integer', minimum: 0, maximum: 10000 },
    confidence: {
      type: 'object', additionalProperties: false,
      required: ['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom'],
      properties: Object.fromEntries(['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom']
        .map((key) => [key, { type: 'number', minimum: 0, maximum: 1 }])),
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
}

const CAPTURE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['expenses'],
  properties: {
    expenses: { type: 'array', minItems: 1, maxItems: 12, items: EXPENSE_CAPTURE_SCHEMA },
  },
}

async function structuredResponse(env, content) {
  const response = await openAI(env, 'responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_STRUCTURED_MODEL?.trim() || DEFAULT_STRUCTURED_MODEL,
      store: false,
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_schema', name: 'expense_capture_batch', strict: true, schema: CAPTURE_SCHEMA } },
    }),
  })
  const body = await response.json()
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') {
        try { return JSON.parse(part.text) } catch { throw new HttpError(502, 'Сервис вернул повреждённый результат.') }
      }
    }
  }
  throw new HttpError(502, 'Сервис не смог распознать расход.')
}

function validConfidence(value) {
  return value && typeof value === 'object' &&
    ['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom'].every((key) =>
      typeof value[key] === 'number' && value[key] >= 0 && value[key] <= 1)
}

function normalizeCaptureItem(value, categoryIds) {
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.amountSatang) ||
    value.amountSatang < 0 || !isExactDate(value.expenseDate) ||
    typeof value.merchant !== 'string' || typeof value.notes !== 'string' ||
    typeof value.categoryId !== 'string' || (value.categoryId && !categoryIds.has(value.categoryId)) ||
    !OWNERS.has(value.owner) || !OWNERS.has(value.paidFrom) ||
    !Number.isSafeInteger(value.ilyaShareBps) || value.ilyaShareBps < 0 || value.ilyaShareBps > 10_000 ||
    !validConfidence(value.confidence) || !Array.isArray(value.warnings) ||
    !value.warnings.every((warning) => typeof warning === 'string')) {
    throw new HttpError(502, 'Не удалось получить корректный черновик. Заполните расход вручную.')
  }
  return {
    draft: {
      amountSatang: value.amountSatang,
      expenseDate: value.expenseDate,
      merchant: value.merchant.trim(),
      notes: value.notes.trim(),
      categoryId: value.categoryId,
      owner: value.owner,
      paidFrom: value.paidFrom,
      ilyaShareBps: value.owner === 'ilya' ? 10_000 : value.owner === 'masha' ? 0 : value.ilyaShareBps,
    },
    confidence: value.confidence,
    warnings: value.warnings,
  }
}

async function loadCaptureContext(db) {
  const [categoryResult, ruleResult] = await Promise.all([
    db.prepare(`SELECT id, name FROM categories WHERE household_id = ?
      AND is_active = 1 ORDER BY name`).bind(HOUSEHOLD_ID).all(),
    db.prepare(`SELECT normalized_merchant, category_id FROM merchant_rules
      WHERE household_id = ?`).bind(HOUSEHOLD_ID).all(),
  ])
  return { categories: categoryResult.results, rules: ruleResult.results }
}

async function extractExpenses(env, context, content, transcript, receipt = false) {
  const today = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit', month: '2-digit', timeZone: 'Asia/Bangkok', year: 'numeric',
  }).format(new Date())
  const mode = receipt
    ? 'Это чек: верни ровно один расход по итоговой сумме; позиции используй только для названия и категории.'
    : 'Выдели каждый отдельно названный платёж или покупку как отдельный расход. Не объединяй несколько сумм в одну. Верни от 1 до 12 расходов в исходном порядке.'
  const instructions = `${mode} Валюта по умолчанию THB; сумму верни в сатангах (1 THB = 100), если другая валюта не указана явно — добавь предупреждение и не конвертируй. Сегодня в Asia/Bangkok: ${today}. merchant — короткое понятное название расхода по-русски: место, если оно названо, иначе предмет или цель расхода; merchant никогда не должен быть пустым. Выбирай категорию по смыслу: падел, теннис, турниры, фитнес и спорт относятся к «Спорт+хобби». Не выдумывай остальные отсутствующие данные: confidence ставь низкой. Для неизвестной даты используй ${today} и предупреждение. owner/paidFrom по умолчанию mutual с низкой уверенностью. Категории: ${JSON.stringify(context.categories)}. categoryId только из списка либо пустая строка. Заметки не должны содержать чековые позиции. Верни только объект схемы.`
  const raw = await structuredResponse(env, [{ type: 'input_text', text: instructions }, ...content])
  if (!Array.isArray(raw?.expenses) || raw.expenses.length === 0) throw new HttpError(502, 'Сервис не смог распознать расходы.')
  const categoryIds = new Set(context.categories.map((category) => category.id))
  const expenses = raw.expenses.map((value) => {
    const result = normalizeCaptureItem(value, categoryIds)
    const detectedCategory = result.draft.categoryId
    const category = context.categories.find((candidate) => candidate.id === detectedCategory)
    if (!result.draft.merchant) result.draft.merchant = category?.name || 'Расход'
    const merchant = normalizeMerchant(result.draft.merchant)
    const rule = context.rules.find((candidate) => candidate.normalized_merchant === merchant)
    if (rule && categoryIds.has(rule.category_id)) {
      result.draft.categoryId = rule.category_id
      result.confidence.category = 1
      result.categoryEvidence = { categoryId: rule.category_id, source: 'merchant_rule' }
    } else {
      const hinted = hintedCategory(context.categories, `${result.draft.merchant} ${result.draft.notes}`)
      if (hinted) {
        result.draft.categoryId = hinted.id
        result.confidence.category = Math.max(result.confidence.category, .95)
        result.categoryEvidence = { categoryId: hinted.id, source: 'keyword_rule' }
      } else {
        result.categoryEvidence = { categoryId: detectedCategory, source: detectedCategory ? 'model' : 'none' }
      }
    }
    return result
  })
  const result = { expenses }
  if (transcript) result.transcript = transcript
  return result
}

async function transcribe(env, file) {
  const form = new FormData()
  form.set('file', file, file.name || 'recording')
  form.set('model', env.OPENAI_TRANSCRIBE_MODEL?.trim() || DEFAULT_TRANSCRIBE_MODEL)
  form.set('response_format', 'json')
  form.set('language', 'ru')
  const response = await openAI(env, 'audio/transcriptions', { method: 'POST', body: form })
  const body = await response.json()
  if (typeof body?.text !== 'string' || !body.text.trim()) {
    throw new HttpError(502, 'Не удалось разобрать запись. Можно заполнить расход вручную.')
  }
  return body.text.trim()
}

function bytesToBase64(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

async function handleCapture(request, env, db, url) {
  if (request.method !== 'POST') throw new HttpError(405, 'Метод не поддерживается.')
  const kind = url.pathname.slice('/api/capture/'.length)
  if (kind === 'text') {
    const [body, context] = await Promise.all([readJson(request), loadCaptureContext(db)])
    const text = requiredString(body.text, 'Введите описание расхода длиной до 4000 символов.', 4000)
    return json(await extractExpenses(env, context, [{ type: 'input_text', text }]))
  }
  if (kind === 'voice') {
    let transcript
    try {
      const form = await request.formData()
      const file = form.get('audio')
      const allowed = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
      if (!(file instanceof File) || !allowed.has(file.type) || file.size <= 0 || file.size > 15 * 1024 * 1024) {
        throw new HttpError(400, 'Запись должна быть WebM, MP4, MP3 или WAV размером до 15 МБ.')
      }
      const [nextTranscript, context] = await Promise.all([transcribe(env, file), loadCaptureContext(db)])
      transcript = nextTranscript
      return json(await extractExpenses(env, context, [{ type: 'input_text', text: transcript }], transcript))
    } catch (error) {
      if (transcript && error instanceof HttpError) error.extra = { ...error.extra, transcript }
      throw error
    }
  }
  if (kind === 'receipt') {
    const contentType = request.headers.get('content-type')?.split(';')[0].trim() || ''
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    const [buffer, context] = await Promise.all([request.arrayBuffer(), loadCaptureContext(db)])
    const bytes = new Uint8Array(buffer)
    if (!allowed.has(contentType) || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      throw new HttpError(400, 'Фото должно быть JPEG, PNG или WebP размером до 10 МБ.')
    }
    const imageUrl = `data:${contentType};base64,${bytesToBase64(bytes)}`
    return json(await extractExpenses(env, context, [
      { type: 'input_text', text: 'Распознай итоговую сумму, магазин/место и дату. Позиции используй только как подсказки для категории и не возвращай их.' },
      { type: 'input_image', image_url: imageUrl },
    ], undefined, true))
  }
  throw new HttpError(404, 'Маршрут не найден.')
}

async function handleApi(request, env) {
  if (!env.DB) throw new HttpError(503, 'База данных сайта не настроена.')
  const identity = authorize(request, env)
  await initializeDatabase(env.DB)
  const url = new URL(request.url)

  if (url.pathname === '/api/session' && request.method === 'GET') {
    return json({ email: identity.email, householdId: HOUSEHOLD_ID, person: identity.person, userId: identity.userId })
  }
  if (url.pathname.startsWith('/api/categories')) return handleCategories(request, env.DB, url)
  if (url.pathname === '/api/merchant-rules') return handleMerchantRules(request, env.DB)
  if (url.pathname.startsWith('/api/expenses')) return handleExpenses(request, env.DB, identity, url)
  if (url.pathname === '/api/budgets') return handleBudgets(request, env.DB)
  if (url.pathname === '/api/settlements') return handleSettlements(request, env.DB, identity)
  if (url.pathname === '/api/rates') return handleRates(request, env.DB, url)
  if (url.pathname.startsWith('/api/capture/')) return handleCapture(request, env, env.DB, url)
  throw new HttpError(404, 'Маршрут не найден.')
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env) } catch (error) { return errorResponse(error) }
    }

    const response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    if (request.method !== 'GET' || response.status !== 404 || !acceptsHtml) return response

    const fallbackUrl = new URL(request.url)
    fallbackUrl.pathname = '/index.html'
    fallbackUrl.search = ''
    return env.ASSETS.fetch(new Request(fallbackUrl, request))
  },
}

export default worker
