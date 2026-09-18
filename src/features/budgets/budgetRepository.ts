import { z } from 'zod'

import type { CategoryLimit, MonthlyBudget } from '../../domain/budget'
import type { BudgetOwner } from '../../domain/expense'

type Response = { data: unknown; error: { message: string } | null }
interface BudgetQuery extends PromiseLike<Response> {
  select(columns: string): BudgetQuery; eq(column: string, value: string): BudgetQuery; in(column: string, values: string[]): BudgetQuery
  order(column: string, options?: { ascending?: boolean }): BudgetQuery; upsert(values: unknown, options?: unknown): BudgetQuery
  insert(values: unknown): BudgetQuery; delete(): BudgetQuery; single(): BudgetQuery
}
export interface BudgetRepositoryClient { from(table: 'monthly_budgets' | 'budget_category_limits'): BudgetQuery }

const BUDGET_COLUMNS = 'id, household_id, month, owner, total_limit_satang'
const LIMIT_COLUMNS = 'monthly_budget_id, category_id, limit_satang'
const budgetSchema = z.object({ id: z.string(), household_id: z.string(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/), owner: z.enum(['ilya', 'masha', 'mutual']), total_limit_satang: z.int() })
const limitSchema = z.object({ monthly_budget_id: z.string(), category_id: z.string(), limit_satang: z.int() })

export interface MonthlyBudgetInput { month: string; owner: BudgetOwner; totalLimitSatang: number }

function read(response: Response, action: string): unknown { if (response.error) throw new Error(`Не удалось ${action}: ${response.error.message}`); return response.data }
function firstOfMonth(month: string): string { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Месяц должен быть в формате ГГГГ-ММ.'); return `${month}-01` }
function mapBudget(row: z.infer<typeof budgetSchema>, limits: CategoryLimit[]): MonthlyBudget { return { month: row.month.slice(0, 7), owner: row.owner, totalLimitSatang: row.total_limit_satang, categoryLimits: limits } }

export function createBudgetRepository(client: BudgetRepositoryClient, householdId: string) {
  async function assertOwned(monthlyBudgetId: string): Promise<void> {
    const response = await client.from('monthly_budgets').select('id').eq('id', monthlyBudgetId).eq('household_id', householdId).single()
    if (!read(response, 'проверить бюджет')) throw new Error('Бюджет не найден.')
  }
  return {
    async list(): Promise<MonthlyBudget[]> {
      const budgetResponse = await client.from('monthly_budgets').select(BUDGET_COLUMNS).eq('household_id', householdId).order('month')
      const budgets = z.array(budgetSchema).safeParse(read(budgetResponse, 'загрузить бюджеты'))
      if (!budgets.success) throw new Error('Получены некорректные данные бюджетов.')
      const ids = budgets.data.map((budget) => budget.id)
      if (ids.length === 0) return []
      const limitsResponse = await client.from('budget_category_limits').select(LIMIT_COLUMNS).in('monthly_budget_id', ids)
      const limits = z.array(limitSchema).safeParse(read(limitsResponse, 'загрузить лимиты категорий'))
      if (!limits.success) throw new Error('Получены некорректные данные лимитов категорий.')
      return budgets.data.map((budget) => mapBudget(budget, limits.data.filter((limit) => limit.monthly_budget_id === budget.id).map((limit) => ({ categoryId: limit.category_id, limitSatang: limit.limit_satang }))))
    },
    async upsertMonthlyBudget(input: MonthlyBudgetInput): Promise<MonthlyBudget> {
      const response = await client.from('monthly_budgets').upsert({ household_id: householdId, month: firstOfMonth(input.month), owner: input.owner, total_limit_satang: input.totalLimitSatang }, { onConflict: 'household_id,month,owner' }).select(BUDGET_COLUMNS).single()
      const row = budgetSchema.safeParse(read(response, 'сохранить бюджет'))
      if (!row.success) throw new Error('Получены некорректные данные бюджета.')
      return mapBudget(row.data, [])
    },
    async replaceCategoryLimits(monthlyBudgetId: string, limits: CategoryLimit[]): Promise<void> {
      await assertOwned(monthlyBudgetId)
      read(await client.from('budget_category_limits').delete().eq('monthly_budget_id', monthlyBudgetId), 'заменить лимиты категорий')
      if (limits.length > 0) read(await client.from('budget_category_limits').insert(limits.map((limit) => ({ monthly_budget_id: monthlyBudgetId, category_id: limit.categoryId, limit_satang: limit.limitSatang }))), 'сохранить лимиты категорий')
    },
    async save(input: MonthlyBudget): Promise<void> {
      const response = await client.from('monthly_budgets').upsert({ household_id: householdId, month: firstOfMonth(input.month), owner: input.owner, total_limit_satang: input.totalLimitSatang }, { onConflict: 'household_id,month,owner' }).select(BUDGET_COLUMNS).single()
      const row = budgetSchema.safeParse(read(response, 'сохранить бюджет'))
      if (!row.success) throw new Error('Получены некорректные данные бюджета.')
      read(await client.from('budget_category_limits').delete().eq('monthly_budget_id', row.data.id), 'заменить лимиты категорий')
      if (input.categoryLimits.length > 0) {
        read(await client.from('budget_category_limits').insert(input.categoryLimits.map((limit) => ({ monthly_budget_id: row.data.id, category_id: limit.categoryId, limit_satang: limit.limitSatang }))), 'сохранить лимиты категорий')
      }
    },
  }
}
