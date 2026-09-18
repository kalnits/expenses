import { describe, expect, it } from 'vitest'

import { convertSatang, formatMoney, parseThb } from './money'

describe('parseThb', () => {
  it('converts a THB decimal string to integer satang', () => {
    expect(parseThb('1250.50')).toBe(125050)
  })

  it.each(['0', '-1', '1.234', '1.', '1,000', 'abc', ''])('rejects invalid or non-positive input %j', (value) => {
    expect(() => parseThb(value)).toThrow()
  })
})

describe('convertSatang', () => {
  it('rounds conversions to an integer minor unit', () => {
    expect(convertSatang(125050, 0.03)).toBe(3752)
  })

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])('rejects an invalid exchange rate %j', (rate) => {
    expect(() => convertSatang(100, rate)).toThrow()
  })
})

describe('formatMoney', () => {
  it('formats THB in the Russian locale', () => {
    expect(normalizeSpaces(formatMoney(125050, 'THB', 1))).toBe('1 250,50 ฿')
  })

  it.each([
    ['USD', 0.03],
    ['ILS', 0.9],
  ] as const)('supports %s', (currency, rate) => {
    expect(formatMoney(10000, currency, rate)).toContain(currency === 'USD' ? '$' : '₪')
  })
})

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, ' ')
}
