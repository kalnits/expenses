import { z } from 'zod'

import type { Person } from '../../domain/expense'
import { apiRequest } from '../../lib/api'

const membershipSchema = z.object({
  householdId: z.string().min(1),
  person: z.enum(['ilya', 'masha']),
  userId: z.string().min(1),
})

export interface HouseholdMembership {
  householdId: string
  person: Person
  userId: string
}

export async function getCurrentMembership(): Promise<HouseholdMembership> {
  const parsed = membershipSchema.safeParse(await apiRequest<unknown>('/api/session'))
  if (!parsed.success) throw new Error('Сайт вернул некорректные данные пользователя.')
  return parsed.data
}
