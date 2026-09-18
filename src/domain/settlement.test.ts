import { describe, expect, it } from 'vitest'

import { settlementEffect } from './settlement'

describe('settlementEffect', () => {
  it('reduces a positive debt balance when Masha settles with Ilya', () => {
    expect(
      settlementEffect(10_000, { from: 'masha', to: 'ilya', amountSatang: 4_000 }),
    ).toEqual({
      from: 'masha',
      to: 'ilya',
      amountSatang: 4_000,
      debtBeforeSatang: 10_000,
      debtDeltaSatang: -4_000,
      debtAfterSatang: 6_000,
    })
  })

  it('reduces a negative debt balance when Ilya settles with Masha', () => {
    expect(
      settlementEffect(-8_000, { from: 'ilya', to: 'masha', amountSatang: 2_500 }),
    ).toEqual({
      from: 'ilya',
      to: 'masha',
      amountSatang: 2_500,
      debtBeforeSatang: -8_000,
      debtDeltaSatang: 2_500,
      debtAfterSatang: -5_500,
    })
  })

  it('supports partial settlements and leaves zero balances unchanged', () => {
    const partial = settlementEffect(10_000, {
      from: 'masha',
      to: 'ilya',
      amountSatang: 4_000,
    })
    const zeroBalance = settlementEffect(0, {
      from: 'masha',
      to: 'ilya',
      amountSatang: 4_000,
    })

    expect(partial.debtAfterSatang).toBe(6_000)
    expect(zeroBalance.debtAfterSatang).toBe(0)
    expect(zeroBalance.debtDeltaSatang).toBe(0)
  })

  it.each([
    { from: 'masha', to: 'ilya', amountSatang: 0 },
    { from: 'masha', to: 'ilya', amountSatang: 1.5 },
    { from: 'masha', to: 'masha', amountSatang: 100 },
  ] as const)('rejects invalid settlements: %o', (input) => {
    expect(() => settlementEffect(10_000, input)).toThrow()
  })
})
