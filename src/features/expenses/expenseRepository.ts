import { z } from 'zod'

import type { BudgetOwner, ExpenseCurrency, PaymentSource } from '../../domain/expense'
import { apiJson, apiRequest } from '../../lib/api'

const expenseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  amountSatang: z.number().int(),
  captureMethod: z.enum(['manual', 'text', 'voice', 'receipt']),
  categoryId: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
  duplicateConfirmed: z.boolean(),
  expenseDate: z.string(),
  ilsPerThb: z.number().nullable(),
  ilyaShareBps: z.number().int(),
  merchant: z.string(),
  normalizedMerchant: z.string(),
  notes: z.string().nullable(),
  owner: z.enum(['ilya', 'masha', 'mutual']),
  originalAmountMinor: z.number().int().positive(),
  originalCurrency: z.enum(['THB', 'ILS', 'USD']),
  paidFrom: z.enum(['ilya', 'masha', 'mutual']),
  usdPerThb: z.number().nullable(),
})

export interface ExpenseRecord {
  id: string; householdId: string; amountSatang: number; captureMethod: 'manual' | 'text' | 'voice' | 'receipt'; categoryId: string
  createdAt: string; createdBy: string; duplicateConfirmed: boolean; expenseDate: string; ilsPerThb: number | null; ilyaShareBps: number
  merchant: string; normalizedMerchant: string; notes: string | null; owner: BudgetOwner; originalAmountMinor: number; originalCurrency: ExpenseCurrency; paidFrom: PaymentSource; usdPerThb: number | null
}

export type ExpenseInput = Omit<ExpenseRecord, 'id' | 'householdId' | 'createdAt' | 'amountSatang'>
export type ExpenseUpdate = Partial<Omit<ExpenseInput, 'createdBy'>>

function parseExpense(value: unknown): ExpenseRecord {
  const parsed = expenseSchema.safeParse(value)
  if (!parsed.success) throw new Error('Получены некорректные данные расхода.')
  return parsed.data
}

export function createExpenseRepository() {
  return {
    async list(): Promise<ExpenseRecord[]> {
      const parsed = z.array(expenseSchema).safeParse(await apiRequest<unknown>('/api/expenses'))
      if (!parsed.success) throw new Error('Получены некорректные данные расходов.')
      return parsed.data
    },
    async create(input: ExpenseInput): Promise<ExpenseRecord> {
      return parseExpense(await apiJson<unknown>('/api/expenses', 'POST', input))
    },
    async findDuplicate(expenseDate: string, amountSatang: number, normalizedMerchant: string): Promise<ExpenseRecord | null> {
      if (!normalizedMerchant) return null
      const search = new URLSearchParams({
        amountSatang: String(amountSatang),
        date: expenseDate,
        merchant: normalizedMerchant,
      })
      const value = await apiRequest<unknown>(`/api/expenses/duplicate?${search}`)
      return value === null ? null : parseExpense(value)
    },
    async update(id: string, input: ExpenseUpdate): Promise<ExpenseRecord> {
      return parseExpense(await apiJson<unknown>(`/api/expenses/${encodeURIComponent(id)}`, 'PATCH', input))
    },
    async delete(id: string): Promise<void> {
      await apiJson(`/api/expenses/${encodeURIComponent(id)}`, 'DELETE')
    },
  }
}
