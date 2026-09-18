/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { AuthGate } from '../features/auth/AuthGate'
import { getCurrentMembership, type HouseholdMembership } from '../features/auth/householdRepository'
import { getSupabaseClient } from '../lib/supabase'
import { DisplayCurrencyProvider } from '../lib/displayCurrency'

type HouseholdContextValue = HouseholdMembership

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export const queryKeys = {
  membership: ['membership'] as const,
  expenses: (householdId: string) => ['expenses', householdId] as const,
  budgets: (householdId: string) => ['budgets', householdId] as const,
  settlements: (householdId: string) => ['settlements', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  debt: (householdId: string) => ['debt', householdId] as const,
  dashboard: (householdId: string) => ['dashboard', householdId] as const,
}

export function useHousehold(): HouseholdContextValue {
  const value = useContext(HouseholdContext)
  if (!value) throw new Error('HouseholdProvider is missing.')
  return value
}

function HouseholdProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseClient()
  const membership = useQuery({
    queryKey: queryKeys.membership,
    queryFn: () => getCurrentMembership(client),
  })

  if (membership.isPending) {
    return <main className="center-state" role="status">Загружаем семейный бюджет…</main>
  }

  if (membership.isError) {
    return (
      <main className="center-state">
        <h1>Не удалось открыть бюджет</h1>
        <p>{membership.error.message}</p>
        <button type="button" onClick={() => void membership.refetch()}>Попробовать снова</button>
      </main>
    )
  }

  if (!membership.data) {
    return (
      <main className="center-state">
        <p className="eyebrow">Расходы в Таиланде</p>
        <h1>Семья не найдена</h1>
        <p>Для этого аккаунта пока нет семейного бюджета. Попросите Илью отправить приглашение или войдите другим адресом.</p>
      </main>
    )
  }

  return <HouseholdContext.Provider value={membership.data}>{children}</HouseholdContext.Provider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  const client = getSupabaseClient()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate client={client}>
          <HouseholdProvider><DisplayCurrencyProvider>{children}</DisplayCurrencyProvider></HouseholdProvider>
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
