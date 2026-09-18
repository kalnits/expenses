import { z } from 'zod'

import type { MonthlyBudget } from '../../domain/budget'
import type { BudgetOwner } from '../../domain/expense'
import { apiJson, apiRequest } from '../../lib/api'

const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  owner: z.enum(['ilya', 'masha', 'mutual']),
  totalLimitSatang: z.number().int().nonnegative(),
  categoryLimits: z.array(z.object({
    categoryId: z.string(),
    limitSatang: z.number().int().nonnegative(),
  })),
})

export interface MonthlyBudgetInput {
  month: string
  owner: BudgetOwner
  totalLimitSatang: number
}

export function createBudgetRepository() {
  return {
    async list(): Promise<MonthlyBudget[]> {
      const parsed = z.array(budgetSchema).safeParse(await apiRequest<unknown>('/api/budgets'))
      if (!parsed.success) throw new Error('Получены некорректные данные бюджетов.')
      return parsed.data
    },
    async upsertMonthlyBudget(input: MonthlyBudgetInput): Promise<MonthlyBudget> {
      const budget = { ...input, categoryLimits: [] }
      await apiJson('/api/budgets', 'PUT', budget)
      return budget
    },
    async save(input: MonthlyBudget): Promise<void> {
      await apiJson('/api/budgets', 'PUT', input)
    },
  }
}
