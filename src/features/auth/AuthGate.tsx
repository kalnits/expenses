import { useEffect, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../lib/database.types'
import { SignInForm } from './SignInForm'

interface AuthGateProps {
  children: ReactNode
  client: Pick<SupabaseClient<Database>, 'auth'>
}

export function AuthGate({ children, client }: AuthGateProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let isMounted = true

    void client.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
      }
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [client])

  if (session === undefined) {
    return <p role="status">Проверяем вход…</p>
  }

  if (!session) {
    return (
      <SignInForm
        sendOtp={async (email) => {
          const { error } = await client.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: window.location.origin,
            },
          })

          if (error) {
            throw error
          }
        }}
      />
    )
  }

  return <>{children}</>
}
