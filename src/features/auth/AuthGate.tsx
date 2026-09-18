import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ApiError } from '../../lib/api'
import { getCurrentMembership, type HouseholdMembership } from './householdRepository'

interface AuthGateProps {
  children: (membership: HouseholdMembership) => ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const membership = useQuery({
    queryKey: ['membership'],
    queryFn: getCurrentMembership,
    retry: false,
  })

  if (membership.isPending) {
    return <main className="center-state" role="status">Проверяем доступ…</main>
  }

  if (membership.isError) {
    const forbidden = membership.error instanceof ApiError && membership.error.status === 403
    return (
      <main className="center-state">
        <p className="eyebrow">Расходы в Таиланде</p>
        <h1>{forbidden ? 'Нет доступа' : 'Не удалось открыть бюджет'}</h1>
        <p>{membership.error.message}</p>
        <button type="button" onClick={() => void membership.refetch()}>Попробовать снова</button>
      </main>
    )
  }

  return <>{children(membership.data)}</>
}
