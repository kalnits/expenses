import type { DebtInput } from './expense'

export type { DebtInput } from './expense'

/**
 * Returns satang owed to Ilya (positive) or to Masha (negative).
 */
export function debtEffect(input: DebtInput): number {
  validateInput(input)

  if (input.owner === 'mutual' && input.paidFrom === 'mutual') {
    return 0
  }

  const ilyaOwed = amountOwedByIlya(input)
  const ilyaPaid = amountPaidByIlya(input)

  return ilyaPaid - ilyaOwed
}

function amountOwedByIlya({
  owner,
  amountSatang,
  ilyaShareBps,
}: DebtInput): number {
  if (owner === 'ilya') {
    return amountSatang
  }

  if (owner === 'masha') {
    return 0
  }

  return roundBps(amountSatang, ilyaShareBps)
}

function roundBps(amountSatang: number, basisPoints: number): number {
  const numerator = BigInt(amountSatang) * BigInt(basisPoints)
  return Number((numerator + 5_000n) / 10_000n)
}

function amountPaidByIlya({ paidFrom, amountSatang }: DebtInput): number {
  if (paidFrom === 'ilya') {
    return amountSatang
  }

  if (paidFrom === 'masha') {
    return 0
  }

  return Math.round(amountSatang / 2)
}

function validateInput({
  owner,
  paidFrom,
  amountSatang,
  ilyaShareBps,
}: DebtInput): void {
  if (!['ilya', 'masha', 'mutual'].includes(owner)) {
    throw new TypeError('Owner must be Ilya, Masha, or mutual.')
  }

  if (!['ilya', 'masha', 'mutual'].includes(paidFrom)) {
    throw new TypeError('Payment source must be Ilya, Masha, or mutual.')
  }

  if (!Number.isSafeInteger(amountSatang) || amountSatang < 0) {
    throw new RangeError('Amount must be a nonnegative integer number of satang.')
  }

  if (
    !Number.isSafeInteger(ilyaShareBps) ||
    ilyaShareBps < 0 ||
    ilyaShareBps > 10_000
  ) {
    throw new RangeError('Ilya share must be an integer between 0 and 10000 bps.')
  }
}
