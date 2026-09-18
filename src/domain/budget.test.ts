import { describe, expect, it } from 'vitest'

import { copyLimits, monthKey, spentByCategory, type MonthlyBudget } from './budget'

describe('monthKey', () => {
  it('uses Bangkok local time at month boundaries', () => {
    expect(monthKey('2026-08-31T16:59:59.999Z')).toBe('2026-08')
    expect(monthKey('2026-08-31T17:00:00.000Z')).toBe('2026-09')
  })

  it('rejects invalid timestamps', () => {
    expect(() => monthKey('not-a-date')).toThrow()
    expect(() => monthKey(new Date('invalid'))).toThrow()
  })
})

describe('copyLimits', () => {
  it('copies a mutual budget into the next month without sharing category limits', () => {
    const september: MonthlyBudget = {
      month: '2026-09',
      owner: 'mutual',
      totalLimitSatang: 3_000_000,
      categoryLimits: [{ categoryId: 'food', limitSatang: 900_000 }],
    }

    const october = copyLimits(september, '2026-10')

    expect(october).toEqual({
      month: '2026-10',
      owner: 'mutual',
      totalLimitSatang: 3_000_000,
      categoryLimits: [{ categoryId: 'food', limitSatang: 900_000 }],
    })
    expect(october.categoryLimits).not.toBe(september.categoryLimits)
    expect(october.categoryLimits[0]).not.toBe(september.categoryLimits[0])
  })

  it('rejects invalid month and monetary limits', () => {
    const valid: MonthlyBudget = {
      month: '2026-09',
      owner: 'mutual',
      totalLimitSatang: 1,
      categoryLimits: [],
    }

    expect(() => copyLimits(valid, '2026-13')).toThrow()
    expect(() => copyLimits({ ...valid, totalLimitSatang: 1.5 }, '2026-10')).toThrow()
    expect(() =>
      copyLimits(
        { ...valid, categoryLimits: [{ categoryId: 'food', limitSatang: -1 }] },
        '2026-10',
      ),
    ).toThrow()
  })
})

describe('spentByCategory', () => {
  it('aggregates a mutual September food expense and excludes August spending', () => {
    expect(
      spentByCategory(
        [
          {
            occurredAt: '2026-09-15T08:00:00+07:00',
            owner: 'mutual',
            categoryId: 'food',
            amountSatang: 420_000,
          },
          {
            occurredAt: '2026-08-31T12:00:00+07:00',
            owner: 'mutual',
            categoryId: 'food',
            amountSatang: 100_000,
          },
        ],
        '2026-09',
        'mutual',
      ),
    ).toEqual({ food: 420_000 })
  })

  it('excludes other owners and rejects nonpositive or noninteger amounts', () => {
    expect(
      spentByCategory(
        [
          {
            occurredAt: '2026-09-01T00:00:00+07:00',
            owner: 'ilya',
            categoryId: 'food',
            amountSatang: 100,
          },
        ],
        '2026-09',
        'mutual',
      ),
    ).toEqual({})

    expect(() =>
      spentByCategory(
        [
          {
            occurredAt: '2026-09-01T00:00:00+07:00',
            owner: 'mutual',
            categoryId: 'food',
            amountSatang: 0,
          },
        ],
        '2026-09',
        'mutual',
      ),
    ).toThrow()
  })
})
