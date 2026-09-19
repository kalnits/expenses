export type Person = 'ilya' | 'masha'

export type ExpenseCurrency = 'THB' | 'ILS' | 'USD'

export type BudgetOwner = Person | 'mutual'

export type PaymentSource = Person | 'mutual'

export interface DebtInput {
  owner: BudgetOwner
  paidFrom: PaymentSource
  amountSatang: number
  ilyaShareBps: number
}
