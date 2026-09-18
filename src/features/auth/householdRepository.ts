import type { SupabaseClient } from '@supabase/supabase-js'

import type { Person } from '../../domain/expense'
import type { Database } from '../../lib/database.types'

export interface HouseholdMembership {
  householdId: string
  person: Person
  userId: string
}

export async function getCurrentMembership(
  client: SupabaseClient<Database>,
): Promise<HouseholdMembership | null> {
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(`Не удалось проверить пользователя: ${userError.message}`)
  if (!userData.user) return null

  const { data, error } = await client
    .from('household_members')
    .select('household_id, person_key, user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) throw new Error(`Не удалось загрузить семью: ${error.message}`)
  if (!data) return null

  return {
    householdId: data.household_id,
    person: data.person_key as Person,
    userId: data.user_id,
  }
}
