import { z } from 'zod'

import type { Person } from '../../domain/expense'
import type { Settlement } from '../../domain/settlement'
import { apiJson, apiRequest } from '../../lib/api'

const settlementSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  from: z.enum(['ilya', 'masha']),
  to: z.enum(['ilya', 'masha']),
  amountSatang: z.number().int(),
  settlementDate: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
})

export interface StoredSettlement extends Settlement {
  id: string
  householdId: string
  settlementDate: string
  createdBy: string
  createdAt: string
}

export interface SettlementInput {
  from: Person
  to: Person
  amountSatang: number
  settlementDate: string
  createdBy: string
}

export function createSettlementRepository() {
  return {
    async list(): Promise<StoredSettlement[]> {
      const parsed = z.array(settlementSchema).safeParse(await apiRequest<unknown>('/api/settlements'))
      if (!parsed.success) throw new Error('Получены некорректные данные расчётов.')
      return parsed.data
    },
    async create(input: SettlementInput): Promise<StoredSettlement> {
      const parsed = settlementSchema.safeParse(await apiJson<unknown>('/api/settlements', 'POST', input))
      if (!parsed.success) throw new Error('Получены некорректные данные расчёта.')
      return parsed.data
    },
  }
}
