/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { getSupabaseClient } from './supabase'

export type DisplayCurrency = 'THB' | 'USD' | 'ILS'
export type ExchangeRate = { rateDate: string; usdPerThb: number; ilsPerThb: number }

const storageKey = 'thailand-expense-tracker.display-currency'
const currencies: DisplayCurrency[] = ['THB', 'USD', 'ILS']

function initialCurrency(): DisplayCurrency {
  const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey)
  return currencies.includes(stored as DisplayCurrency) ? stored as DisplayCurrency : 'THB'
}

function formatCurrency(value: number, currency: DisplayCurrency): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
}

type DisplayCurrencyContextValue = {
  currency: DisplayCurrency
  setCurrency: (currency: DisplayCurrency) => void
  format: (amountSatang: number, rate?: Pick<ExchangeRate, 'usdPerThb' | 'ilsPerThb'> | { usdPerThb: number | null; ilsPerThb: number | null } | null) => string
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null)

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, updateCurrency] = useState<DisplayCurrency>(initialCurrency)
  const value = useMemo<DisplayCurrencyContextValue>(() => ({
    currency,
    setCurrency(next) { window.localStorage.setItem(storageKey, next); updateCurrency(next) },
    format(amountSatang, rate) {
      if (currency === 'THB') return formatCurrency(amountSatang / 100, 'THB')
      const multiplier = currency === 'USD' ? rate?.usdPerThb : rate?.ilsPerThb
      return multiplier ? formatCurrency(amountSatang / 100 * multiplier, currency) : 'Курс недоступен'
    },
  }), [currency])
  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const value = useContext(DisplayCurrencyContext)
  if (!value) throw new Error('DisplayCurrencyProvider is missing.')
  return value
}

export async function requestExchangeRate(date: string, expenseId?: string): Promise<ExchangeRate> {
  const client = getSupabaseClient()
  const { data, error } = await client.functions.invoke('exchange-rate', { body: { date, ...(expenseId ? { expenseId } : {}) } })
  if (error) throw new Error('Курс недоступен.')
  const response = data as Partial<ExchangeRate> | null
  if (!response || response.rateDate !== date || !Number.isFinite(response.usdPerThb) || !Number.isFinite(response.ilsPerThb)) throw new Error('Курс недоступен.')
  return response as ExchangeRate
}

export function useExchangeRate(date: string, embedded?: { usdPerThb: number | null; ilsPerThb: number | null } | null) {
  const validEmbedded = embedded?.usdPerThb && embedded.ilsPerThb ? embedded : undefined
  return useQuery({ queryKey: ['exchange-rate', date], queryFn: () => requestExchangeRate(date), enabled: !validEmbedded && Boolean(date), retry: false, staleTime: 86_400_000 })
}

export function MoneyAmount({ amountSatang, date, rate, className }: { amountSatang: number; date: string; rate?: { usdPerThb: number | null; ilsPerThb: number | null } | null; className?: string }) {
  const { format } = useDisplayCurrency()
  const requested = useExchangeRate(date, rate)
  const embedded = rate?.usdPerThb && rate.ilsPerThb ? rate : undefined
  return <span className={className}>{format(amountSatang, embedded ?? requested.data)}</span>
}

export function CurrencySelector() {
  const { currency, setCurrency } = useDisplayCurrency()
  return <label className="currency-selector">Валюта<select value={currency} onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}><option value="THB">THB · ฿</option><option value="USD">USD · $</option><option value="ILS">ILS · ₪</option></select></label>
}
