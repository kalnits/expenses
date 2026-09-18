import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../lib/database.types'

export interface CategoryRecord {
  id: string
  name: string
  normalizedName: string
  isActive: boolean
}

export function createCategoryRepository(client: SupabaseClient<Database>, householdId: string) {
  return {
    async list(): Promise<CategoryRecord[]> {
      const { data, error } = await client.from('categories').select('id, name, normalized_name, is_active').eq('household_id', householdId).order('name')
      if (error) throw new Error(`Не удалось загрузить категории: ${error.message}`)
      return data.map((row) => ({ id: row.id, name: row.name, normalizedName: row.normalized_name, isActive: row.is_active }))
    },
    async create(name: string): Promise<void> {
      const normalizedName = name.trim().toLocaleLowerCase('ru-RU')
      const { error } = await client.from('categories').insert({ household_id: householdId, name: name.trim(), normalized_name: normalizedName })
      if (error) throw new Error(`Не удалось создать категорию: ${error.message}`)
    },
    async rename(id: string, name: string): Promise<void> {
      const normalizedName = name.trim().toLocaleLowerCase('ru-RU')
      const { error } = await client.from('categories').update({ name: name.trim(), normalized_name: normalizedName }).eq('household_id', householdId).eq('id', id)
      if (error) throw new Error(`Не удалось переименовать категорию: ${error.message}`)
    },
    async setActive(id: string, isActive: boolean): Promise<void> {
      const { error } = await client.from('categories').update({ is_active: isActive }).eq('household_id', householdId).eq('id', id)
      if (error) throw new Error(`Не удалось изменить категорию: ${error.message}`)
    },
    async merge(sourceId: string, targetId: string): Promise<void> {
      const { error } = await client.rpc('merge_category', { source_category_id: sourceId, target_category_id: targetId })
      if (error) throw new Error(`Не удалось объединить категории: ${error.message}`)
    },
    async rememberMerchant(normalizedMerchant: string, categoryId: string): Promise<void> {
      if (!normalizedMerchant) return
      const { error } = await client.from('merchant_rules').upsert({ household_id: householdId, normalized_merchant: normalizedMerchant, category_id: categoryId }, { onConflict: 'household_id,normalized_merchant' })
      if (error) throw new Error(`Не удалось запомнить категорию магазина: ${error.message}`)
    },
  }
}
