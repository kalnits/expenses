import { z } from 'zod'

import type { Person } from '../../domain/expense'
import type { Settlement } from '../../domain/settlement'

type Response = { data: unknown; error: { message: string } | null }
interface SettlementQuery extends PromiseLike<Response> { select(columns: string): SettlementQuery; eq(column: string, value: string): SettlementQuery; order(column: string, options?: { ascending?: boolean }): SettlementQuery; insert(values: unknown): SettlementQuery; single(): SettlementQuery }
export interface SettlementRepositoryClient { from(table: 'settlements'): SettlementQuery }

const SETTLEMENT_COLUMNS = 'id, household_id, from_person, to_person, amount_satang, settlement_date, created_by, created_at'
const schema = z.object({ id: z.string(), household_id: z.string(), from_person: z.enum(['ilya', 'masha']), to_person: z.enum(['ilya', 'masha']), amount_satang: z.int(), settlement_date: z.string(), created_by: z.string(), created_at: z.string() })
export interface StoredSettlement extends Settlement { id: string; householdId: string; settlementDate: string; createdBy: string; createdAt: string }
export interface SettlementInput { from: Person; to: Person; amountSatang: number; settlementDate: string; createdBy: string }

function read(response: Response, action: string): unknown { if (response.error) throw new Error(`Не удалось ${action}: ${response.error.message}`); return response.data }
function map(value: unknown): StoredSettlement { const row = schema.safeParse(value); if (!row.success) throw new Error('Получены некорректные данные расчёта.'); return { id: row.data.id, householdId: row.data.household_id, from: row.data.from_person, to: row.data.to_person, amountSatang: row.data.amount_satang, settlementDate: row.data.settlement_date, createdBy: row.data.created_by, createdAt: row.data.created_at } }

export function createSettlementRepository(client: SettlementRepositoryClient, householdId: string) {
  return {
    async list(): Promise<StoredSettlement[]> {
      const response = await client.from('settlements').select(SETTLEMENT_COLUMNS).eq('household_id', householdId).order('settlement_date', { ascending: false })
      const rows = z.array(schema).safeParse(read(response, 'загрузить расчёты'))
      if (!rows.success) throw new Error('Получены некорректные данные расчётов.')
      return rows.data.map(map)
    },
    async create(input: SettlementInput): Promise<StoredSettlement> {
      const response = await client.from('settlements').insert({ household_id: householdId, from_person: input.from, to_person: input.to, amount_satang: input.amountSatang, settlement_date: input.settlementDate, created_by: input.createdBy }).select(SETTLEMENT_COLUMNS).single()
      return map(read(response, 'создать расчёт'))
    },
  }
}
