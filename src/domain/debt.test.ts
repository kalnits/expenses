import { describe, expect, it } from 'vitest'

import { debtEffect } from './debt'

describe('debtEffect', () => {
  it.each([
    { owner: 'mutual', paidFrom: 'mutual', expected: 0 },
    { owner: 'mutual', paidFrom: 'ilya', expected: 4000 },
    { owner: 'mutual', paidFrom: 'masha', expected: -6000 },
    { owner: 'ilya', paidFrom: 'ilya', expected: 0 },
    { owner: 'ilya', paidFrom: 'masha', expected: -10000 },
    { owner: 'masha', paidFrom: 'masha', expected: 0 },
    { owner: 'masha', paidFrom: 'ilya', expected: 10000 },
    { owner: 'ilya', paidFrom: 'mutual', expected: -5000 },
    { owner: 'masha', paidFrom: 'mutual', expected: 5000 },
  ] as const)(
    'returns $expected satang for an expense owned by $owner and paid from $paidFrom',
    ({ owner, paidFrom, expected }) => {
      expect(
        debtEffect({ owner, paidFrom, amountSatang: 10000, ilyaShareBps: 6000 }),
      ).toBe(expected)
    },
  )

  it('uses deterministic integer rounding for a personal expense paid by mutual funds', () => {
    expect(
      debtEffect({
        owner: 'ilya',
        paidFrom: 'mutual',
        amountSatang: 101,
        ilyaShareBps: 6000,
      }),
    ).toBe(-50)
  })

  it('keeps shared-expense allocation exact for large safe-integer amounts', () => {
    expect(
      debtEffect({
        owner: 'mutual',
        paidFrom: 'masha',
        amountSatang: 9_007_199_254_740_991,
        ilyaShareBps: 9999,
      }),
    ).toBe(-9_006_298_534_815_517)
  })

  it.each([
    { amountSatang: -1 },
    { amountSatang: 1.5 },
    { ilyaShareBps: -1 },
    { ilyaShareBps: 10001 },
    { ilyaShareBps: 1.5 },
  ])('rejects invalid monetary inputs: %o', (override) => {
    expect(() =>
      debtEffect({
        owner: 'mutual',
        paidFrom: 'mutual',
        amountSatang: 10000,
        ilyaShareBps: 6000,
        ...override,
      }),
    ).toThrow()
  })
})
