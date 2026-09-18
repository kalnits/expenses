import { z } from 'zod'

import { apiJson, apiRequest } from '../../lib/api'

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  normalizedName: z.string(),
  isActive: z.boolean(),
})

export interface CategoryRecord {
  id: string
  name: string
  normalizedName: string
  isActive: boolean
}

export function createCategoryRepository() {
  return {
    async list(): Promise<CategoryRecord[]> {
      const parsed = z.array(categorySchema).safeParse(await apiRequest<unknown>('/api/categories'))
      if (!parsed.success) throw new Error('Получены некорректные данные категорий.')
      return parsed.data
    },
    async create(name: string): Promise<void> {
      await apiJson('/api/categories', 'POST', { name })
    },
    async rename(id: string, name: string): Promise<void> {
      await apiJson(`/api/categories/${encodeURIComponent(id)}`, 'PATCH', { name })
    },
    async setActive(id: string, isActive: boolean): Promise<void> {
      await apiJson(`/api/categories/${encodeURIComponent(id)}`, 'PATCH', { isActive })
    },
    async merge(sourceId: string, targetId: string): Promise<void> {
      await apiJson(`/api/categories/${encodeURIComponent(sourceId)}/merge`, 'POST', { targetId })
    },
    async rememberMerchant(normalizedMerchant: string, categoryId: string): Promise<void> {
      if (!normalizedMerchant) return
      await apiJson('/api/merchant-rules', 'PUT', { categoryId, normalizedMerchant })
    },
  }
}
