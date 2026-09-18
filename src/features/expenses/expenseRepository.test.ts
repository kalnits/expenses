import { describe, expect, it } from 'vitest'

import {
  createExpenseRepository,
  type ExpenseInput,
  type ExpenseRepositoryClient,
} from './expenseRepository'

const householdId = 'household-1'
const expenseRow = {
  id: 'expense-1',
  household_id: householdId,
  amount_satang: 12550,
  capture_method: 'manual',
  category_id: 'food',
  created_at: '2026-09-18T10:00:00.000Z',
  created_by: 'user-1',
  duplicate_confirmed: false,
  expense_date: '2026-09-18',
  ils_per_thb: null,
  ilya_share_bps: 5000,
  merchant: 'Market',
  normalized_merchant: 'market',
  notes: null,
  owner: 'mutual',
  paid_from: 'ilya',
  usd_per_thb: 0.028,
}

const expenseInput: ExpenseInput = {
  amountSatang: 12550,
  captureMethod: 'manual',
  categoryId: 'food',
  createdBy: 'user-1',
  duplicateConfirmed: false,
  expenseDate: '2026-09-18',
  ilsPerThb: null,
  ilyaShareBps: 5000,
  merchant: 'Market',
  normalizedMerchant: 'market',
  notes: null,
  owner: 'mutual',
  paidFrom: 'ilya',
  usdPerThb: 0.028,
}

function fakeClient(response: { data: unknown; error: { message: string } | null }) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (...args: unknown[]) => {
      calls.push(['select', ...args])
      return query
    },
    eq: (...args: unknown[]) => {
      calls.push(['eq', ...args])
      return query
    },
    order: (...args: unknown[]) => {
      calls.push(['order', ...args])
      return query
    },
    insert: (...args: unknown[]) => {
      calls.push(['insert', ...args])
      return query
    },
    update: (...args: unknown[]) => {
      calls.push(['update', ...args])
      return query
    },
    delete: () => {
      calls.push(['delete'])
      return query
    },
    single: () => {
      calls.push(['single'])
      return query
    },
    then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
  }

  return {
    client: { from: (table: string) => { calls.push(['from', table]); return query } } as unknown as ExpenseRepositoryClient,
    calls,
  }
}

describe('expenseRepository', () => {
  it('lists mapped household expenses with explicit columns', async () => {
    const fake = fakeClient({ data: [expenseRow], error: null })
    const repository = createExpenseRepository(fake.client, householdId)

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ amountSatang: 12550, paidFrom: 'ilya', usdPerThb: 0.028 }),
    ])
    expect(fake.calls).toContainEqual(['eq', 'household_id', householdId])
    expect(fake.calls.find(([name]) => name === 'select')?.[1]).not.toContain('*')
  })

  it('adds the household identifier when creating an expense', async () => {
    const fake = fakeClient({ data: expenseRow, error: null })

    await createExpenseRepository(fake.client, householdId).create(expenseInput)

    expect(fake.calls).toContainEqual(['insert', expect.objectContaining({ household_id: householdId, amount_satang: 12550 })])
  })

  it('scopes updates and deletion to the household', async () => {
    const fake = fakeClient({ data: expenseRow, error: null })
    const repository = createExpenseRepository(fake.client, householdId)

    await repository.update(expenseRow.id, { notes: 'receipt saved' })
    await repository.delete(expenseRow.id)

    expect(fake.calls.filter(([name]) => name === 'eq')).toEqual(expect.arrayContaining([
      ['eq', 'id', expenseRow.id],
      ['eq', 'household_id', householdId],
    ]))
  })

  it('throws a clear error returned by Supabase', async () => {
    const fake = fakeClient({ data: null, error: { message: 'permission denied' } })

    await expect(createExpenseRepository(fake.client, householdId).list()).rejects.toThrow('Не удалось загрузить расходы')
  })
})
