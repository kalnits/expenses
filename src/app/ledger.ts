import { debtEffect } from '../domain/debt'
import type { BudgetOwner, PaymentSource } from '../domain/expense'
import type { ExpenseRecord } from '../features/expenses/expenseRepository'
import type { StoredSettlement } from '../features/settlements/settlementRepository'

export const ownerLabels: Record<BudgetOwner, string> = { ilya: 'Илья', masha: 'Маша', mutual: 'Общие' }
export const sourceLabels: Record<PaymentSource, string> = { ilya: 'Илья', masha: 'Маша', mutual: 'Общий счёт' }

export function formatThb(amountSatang: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amountSatang / 100)
}

export function bangkokToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function currentBangkokMonth(): string { return bangkokToday().slice(0, 7) }

export function monthBounds(month: string): { start: string; end: string } {
  const [year, value] = month.split('-').map(Number)
  const next = value === 12 ? `${year + 1}-01-01` : `${year}-${String(value + 1).padStart(2, '0')}-01`
  return { start: `${month}-01`, end: next }
}

export function previousMonth(month: string): string {
  const [year, value] = month.split('-').map(Number)
  return value === 1 ? `${year - 1}-12` : `${year}-${String(value - 1).padStart(2, '0')}`
}

export function calculateDebt(expenses: readonly ExpenseRecord[], settlements: readonly StoredSettlement[]): number {
  const fromExpenses = expenses.reduce((sum, expense) => sum + debtEffect(expense), 0)
  const fromSettlements = settlements.reduce((sum, settlement) => sum + (settlement.from === 'masha' ? -settlement.amountSatang : settlement.amountSatang), 0)
  return fromExpenses + fromSettlements
}

export function debtSentence(balance: number, format: (amountSatang: number) => string = formatThb): string {
  if (balance === 0) return 'Сейчас никто никому не должен.'
  return balance > 0
    ? `Маша должна Илье ${format(balance)}.`
    : `Илья должен Маше ${format(Math.abs(balance))}.`
}
