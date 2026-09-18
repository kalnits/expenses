export const HOUSEHOLD_ID = 'thailand-household'

export const defaultCategories = [
  ['category-groceries', 'Продукты', 'продукты'],
  ['category-restaurants', 'Кафе и рестораны', 'кафе и рестораны'],
  ['category-transport', 'Транспорт', 'транспорт'],
  ['category-home', 'Дом', 'дом'],
  ['category-health', 'Здоровье', 'здоровье'],
  ['category-connectivity', 'Связь', 'связь'],
  ['category-entertainment', 'Развлечения', 'развлечения'],
  ['category-other', 'Прочее', 'прочее'],
] as const

/**
 * Canonical D1 schema. The checked-in SQL migration contains the executable
 * form; runtime initialization mirrors each statement independently because
 * D1 prepared statements must contain exactly one SQL statement.
 */
export const tables = {
  categories: {
    primaryKey: ['id'],
    columns: ['id', 'household_id', 'name', 'normalized_name', 'is_active', 'created_at'],
  },
  merchantRules: {
    primaryKey: ['id'],
    unique: [['household_id', 'normalized_merchant']],
    columns: ['id', 'household_id', 'normalized_merchant', 'category_id', 'created_at', 'updated_at'],
  },
  monthlyBudgets: {
    primaryKey: ['id'],
    unique: [['household_id', 'month', 'owner']],
    columns: ['id', 'household_id', 'month', 'owner', 'total_limit_satang', 'created_at', 'updated_at'],
  },
  budgetCategoryLimits: {
    primaryKey: ['monthly_budget_id', 'category_id'],
    columns: ['monthly_budget_id', 'category_id', 'limit_satang', 'created_at'],
  },
  expenses: {
    primaryKey: ['id'],
    columns: ['id', 'household_id', 'amount_satang', 'capture_method', 'category_id', 'created_at', 'created_by', 'duplicate_confirmed', 'expense_date', 'ils_per_thb', 'ilya_share_bps', 'merchant', 'normalized_merchant', 'notes', 'owner', 'paid_from', 'usd_per_thb', 'updated_at'],
  },
  settlements: {
    primaryKey: ['id'],
    columns: ['id', 'household_id', 'from_person', 'to_person', 'amount_satang', 'settlement_date', 'created_by', 'created_at'],
  },
  exchangeRates: {
    primaryKey: ['rate_date'],
    columns: ['rate_date', 'usd_per_thb', 'ils_per_thb', 'fetched_at'],
  },
} as const
