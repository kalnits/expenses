import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

type SupabaseEnvironment = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

let browserClient: SupabaseClient<Database> | undefined

export function createSupabaseClient(
  environment: SupabaseEnvironment = (import.meta as ImportMeta & { env: SupabaseEnvironment }).env,
): SupabaseClient<Database> {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const anonKey = environment.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error('Не настроено подключение к базе данных. Проверьте переменные Supabase.')
  }

  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname || /\s/.test(anonKey)) {
      throw new TypeError('Invalid Supabase configuration')
    }
  } catch {
    throw new Error('Настройки Supabase имеют неверный формат.')
  }

  return createClient<Database>(url, anonKey)
}

export function getSupabaseClient(): SupabaseClient<Database> {
  browserClient ??= createSupabaseClient()
  return browserClient
}
