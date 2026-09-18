import type { Person } from './expense'

export interface Settlement {
  from: Person
  to: Person
  amountSatang: number
}

export interface SettlementEffect extends Settlement {
  /** Change to a debt balance where positive means Masha owes Ilya. */
  debtBeforeSatang: number
  debtDeltaSatang: number
  debtAfterSatang: number
}

export function settlementEffect(
  debtBeforeSatang: number,
  settlement: Settlement,
): SettlementEffect {
  validateDebtBalance(debtBeforeSatang)
  validateSettlement(settlement)

  const requestedDelta =
    settlement.from === 'masha' ? -settlement.amountSatang : settlement.amountSatang
  const debtDeltaSatang = settlementDelta(debtBeforeSatang, requestedDelta)

  return {
    ...settlement,
    debtBeforeSatang,
    debtDeltaSatang,
    debtAfterSatang: debtBeforeSatang + debtDeltaSatang,
  }
}

function settlementDelta(balance: number, requestedDelta: number): number {
  if (balance === 0 || Math.sign(balance) === Math.sign(requestedDelta)) {
    return 0
  }

  return Math.sign(requestedDelta) * Math.min(Math.abs(balance), Math.abs(requestedDelta))
}

function validateDebtBalance(debtBalanceSatang: number): void {
  if (!Number.isSafeInteger(debtBalanceSatang)) {
    throw new RangeError('Debt balance must be an integer number of satang.')
  }
}

function validateSettlement({ from, to, amountSatang }: Settlement): void {
  if (!['ilya', 'masha'].includes(from) || !['ilya', 'masha'].includes(to)) {
    throw new TypeError('Settlement participants must be Ilya or Masha.')
  }

  if (from === to) {
    throw new RangeError('Settlement sender and recipient must differ.')
  }

  if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) {
    throw new RangeError('Settlement amount must be a positive integer number of satang.')
  }
}
