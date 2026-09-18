import { z } from 'zod'

import type { BudgetOwner, PaymentSource } from '../../domain/expense'

type RepositoryError = { message: string } | null
type RepositoryResponse = { data: unknown; error: RepositoryError }

interface ExpenseQuery extends PromiseLike<RepositoryResponse> {
  select(columns: string): ExpenseQuery
  eq(column: string, value: string | number): ExpenseQuery
  order(column: string, options?: { ascending?: boolean }): ExpenseQuery
  limit(count: number): ExpenseQuery
  insert(values: unknown): ExpenseQuery
  update(values: unknown): ExpenseQuery
  delete(): ExpenseQuery
  single(): ExpenseQuery
}

export interface ExpenseRepositoryClient {
  from(table: 'expenses'): ExpenseQuery
}

const EXPENSE_COLUMNS = 'id, household_id, amount_satang, capture_method, category_id, created_at, created_by, duplicate_confirmed, expense_date, ils_per_thb, ilya_share_bps, merchant, normalized_merchant, notes, owner, paid_from, usd_per_thb'
const expenseRowSchema = z.object({
  id: z.string(), household_id: z.string(), amount_satang: z.int(),
  capture_method: z.enum(['manual', 'text', 'voice', 'receipt']), category_id: z.string(), created_at: z.string(), created_by: z.string(),
  duplicate_confirmed: z.boolean(), expense_date: z.string(), ils_per_thb: z.number().nullable(), ilya_share_bps: z.int(),
  merchant: z.string(), normalized_merchant: z.string(), notes: z.string().nullable(), owner: z.enum(['ilya', 'masha', 'mutual']),
  paid_from: z.enum(['ilya', 'masha', 'mutual']), usd_per_thb: z.number().nullable(),
})

export interface ExpenseRecord {
  id: string; householdId: string; amountSatang: number; captureMethod: 'manual' | 'text' | 'voice' | 'receipt'; categoryId: string
  createdAt: string; createdBy: string; duplicateConfirmed: boolean; expenseDate: string; ilsPerThb: number | null; ilyaShareBps: number
  merchant: string; normalizedMerchant: string; notes: string | null; owner: BudgetOwner; paidFrom: PaymentSource; usdPerThb: number | null
}

export type ExpenseInput = Omit<ExpenseRecord, 'id' | 'householdId' | 'createdAt'>
export type ExpenseUpdate = Partial<Omit<ExpenseInput, 'createdBy'>>

function readResponse(response: RepositoryResponse, action: string): unknown {
  if (response.error) throw new Error(`Не удалось ${action}: ${response.error.message}`)
  return response.data
}

function mapExpense(value: unknown): ExpenseRecord {
  const parsed = expenseRowSchema.safeParse(value)
  if (!parsed.success) throw new Error('Получены некорректные данные расхода.')
  const row = parsed.data
  return {
    id: row.id, householdId: row.household_id, amountSatang: row.amount_satang, captureMethod: row.capture_method,
    categoryId: row.category_id, createdAt: row.created_at, createdBy: row.created_by, duplicateConfirmed: row.duplicate_confirmed,
    expenseDate: row.expense_date, ilsPerThb: row.ils_per_thb, ilyaShareBps: row.ilya_share_bps, merchant: row.merchant,
    normalizedMerchant: row.normalized_merchant, notes: row.notes, owner: row.owner, paidFrom: row.paid_from, usdPerThb: row.usd_per_thb,
  }
}

function toRow(input: ExpenseInput | ExpenseUpdate): Record<string, unknown> {
  const mapping: Record<string, string> = {
    amountSatang: 'amount_satang', captureMethod: 'capture_method', categoryId: 'category_id', createdBy: 'created_by',
    duplicateConfirmed: 'duplicate_confirmed', expenseDate: 'expense_date', ilsPerThb: 'ils_per_thb', ilyaShareBps: 'ilya_share_bps',
    merchant: 'merchant', normalizedMerchant: 'normalized_merchant', notes: 'notes', owner: 'owner', paidFrom: 'paid_from', usdPerThb: 'usd_per_thb',
  }
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [mapping[key] ?? key, value]))
}

export function createExpenseRepository(client: ExpenseRepositoryClient, householdId: string) {
  return {
    async list(): Promise<ExpenseRecord[]> {
      const response = await client.from('expenses').select(EXPENSE_COLUMNS).eq('household_id', householdId).order('expense_date', { ascending: false })
      const data = readResponse(response, 'загрузить расходы')
      const rows = z.array(expenseRowSchema).safeParse(data)
      if (!rows.success) throw new Error('Получены некорректные данные расходов.')
      return rows.data.map(mapExpense)
    },
    async create(input: ExpenseInput): Promise<ExpenseRecord> {
      const response = await client.from('expenses').insert({ ...toRow(input), household_id: householdId }).select(EXPENSE_COLUMNS).single()
      return mapExpense(readResponse(response, 'создать расход'))
    },
    async findDuplicate(expenseDate: string, amountSatang: number, normalizedMerchant: string): Promise<ExpenseRecord | null> {
      if (!normalizedMerchant) return null
      const response = await client.from('expenses').select(EXPENSE_COLUMNS).eq('household_id', householdId).eq('expense_date', expenseDate).eq('amount_satang', amountSatang).limit(25)
      const data = readResponse(response, 'проверить похожие расходы')
      const rows = z.array(expenseRowSchema).safeParse(data)
      if (!rows.success) throw new Error('Получены некорректные данные расходов.')
      const duplicate = rows.data.find((row) => row.normalized_merchant === normalizedMerchant)
      return duplicate ? mapExpense(duplicate) : null
    },
    async update(id: string, input: ExpenseUpdate): Promise<ExpenseRecord> {
      const response = await client.from('expenses').update(toRow(input)).eq('id', id).eq('household_id', householdId).select(EXPENSE_COLUMNS).single()
      return mapExpense(readResponse(response, 'обновить расход'))
    },
    async delete(id: string): Promise<void> {
      const response = await client.from('expenses').delete().eq('id', id).eq('household_id', householdId).select('id').single()
      readResponse(response, 'удалить расход')
    },
  }
}
