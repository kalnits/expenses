/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { AuthGate } from '../features/auth/AuthGate'
import type { HouseholdMembership } from '../features/auth/householdRepository'
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

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate>
          {(membership) => (
            <HouseholdContext.Provider value={membership}>
              <DisplayCurrencyProvider>{children}</DisplayCurrencyProvider>
            </HouseholdContext.Provider>
          )}
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
