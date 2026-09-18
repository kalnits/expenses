export type Currency = 'THB' | 'USD' | 'ILS'

const THB_INPUT = /^(?<baht>\d+)(?:\.(?<satang>\d{1,2}))?$/

export function parseThb(value: string): number {
  const match = THB_INPUT.exec(value)

  if (!match?.groups) {
    throw new TypeError('Enter a positive THB amount with up to two decimal places.')
  }

  const baht = Number(match.groups.baht)
  const satang = Number((match.groups.satang ?? '').padEnd(2, '0'))
  const amountSatang = baht * 100 + satang

  assertPositiveSafeInteger(amountSatang, 'THB amount')
  return amountSatang
}

export function convertSatang(amountSatang: number, rate: number): number {
  assertNonNegativeSafeInteger(amountSatang, 'Amount')

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Exchange rate must be a positive finite number.')
  }

  const converted = Math.round(amountSatang * rate)
  assertNonNegativeSafeInteger(converted, 'Converted amount')
  return converted
}

export function formatMoney(
  amountSatang: number,
  currency: Currency,
  rate: number,
): string {
  const convertedSatang = convertSatang(amountSatang, rate)

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedSatang / 100)
}

function assertPositiveSafeInteger(value: number, label: string): void {
  assertNonNegativeSafeInteger(value, label)

  if (value === 0) {
    throw new RangeError(`${label} must be positive.`)
  }
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`)
  }
}
