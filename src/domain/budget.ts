import type { BudgetOwner } from './expense'

export type BudgetCurrency = 'THB' | 'ILS'

export interface CategoryLimit {
  categoryId: string
  limitSatang: number
}

export interface MonthlyBudget {
  month: string
  owner: BudgetOwner
  currency: BudgetCurrency
  totalLimitSatang: number
  categoryLimits: CategoryLimit[]
}

export interface ExpenseSummary {
  occurredAt: Date | string
  owner: BudgetOwner
  categoryId: string
  amountSatang: number
}

const BANGKOK_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1_000
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function monthKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Date must be a valid timestamp.')
  }

  const bangkokDate = new Date(date.getTime() + BANGKOK_OFFSET_MILLISECONDS)
  const year = bangkokDate.getUTCFullYear()
  const month = String(bangkokDate.getUTCMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function copyLimits(previous: MonthlyBudget, nextMonth: string): MonthlyBudget {
  validateMonth(nextMonth)
  validateBudget(previous)

  return {
    month: nextMonth,
    owner: previous.owner,
    currency: previous.currency,
    totalLimitSatang: previous.totalLimitSatang,
    categoryLimits: previous.categoryLimits.map((limit) => ({ ...limit })),
  }
}

export function expenseAmountInBudgetMinor(amountSatang: number, currency: BudgetCurrency, ilsPerThb?: number | null): number | null {
  if (currency === 'THB') return amountSatang
  return typeof ilsPerThb === 'number' && Number.isFinite(ilsPerThb) && ilsPerThb > 0
    ? Math.round(amountSatang * ilsPerThb)
    : null
}

export function spentByCategory(
  expenses: readonly ExpenseSummary[],
  month: string,
  owner: BudgetOwner,
): Record<string, number> {
  validateMonth(month)
  validateOwner(owner)

  return expenses.reduce<Record<string, number>>((spent, expense) => {
    validateExpense(expense)

    if (expense.owner === owner && monthKey(expense.occurredAt) === month) {
      spent[expense.categoryId] = (spent[expense.categoryId] ?? 0) + expense.amountSatang
    }

    return spent
  }, {})
}

function validateBudget(budget: MonthlyBudget): void {
  validateMonth(budget.month)
  validateOwner(budget.owner)
  if (!['THB', 'ILS'].includes(budget.currency)) throw new TypeError('Budget currency must be THB or ILS.')
  validateSatangLimit(budget.totalLimitSatang)

  for (const limit of budget.categoryLimits) {
    if (!limit || typeof limit.categoryId !== 'string' || limit.categoryId.length === 0) {
      throw new TypeError('Category ID must be a nonempty string.')
    }

    validateSatangLimit(limit.limitSatang)
  }
}

function validateExpense(expense: ExpenseSummary): void {
  if (!expense || typeof expense.categoryId !== 'string' || expense.categoryId.length === 0) {
    throw new TypeError('Category ID must be a nonempty string.')
  }

  validateOwner(expense.owner)
  monthKey(expense.occurredAt)

  if (!Number.isSafeInteger(expense.amountSatang) || expense.amountSatang <= 0) {
    throw new RangeError('Expense amount must be a positive integer number of satang.')
  }
}

function validateMonth(month: string): void {
  if (typeof month !== 'string' || !MONTH_PATTERN.test(month)) {
    throw new TypeError('Month must use YYYY-MM format.')
  }
}

function validateOwner(owner: BudgetOwner): void {
  if (!['ilya', 'masha', 'mutual'].includes(owner)) {
    throw new TypeError('Owner must be Ilya, Masha, or mutual.')
  }
}

function validateSatangLimit(amountSatang: number): void {
  if (!Number.isSafeInteger(amountSatang) || amountSatang < 0) {
    throw new RangeError('Limit must be a nonnegative integer number of satang.')
  }
}
