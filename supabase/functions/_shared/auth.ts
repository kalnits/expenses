import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface FunctionContext {
  client: ReturnType<typeof createClient>
  householdId: string
  person: 'ilya' | 'masha'
  userId: string
}

export async function requireHousehold(request: Request): Promise<FunctionContext> {
  const url = Deno.env.get('SUPABASE_URL')?.trim()
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
  if (!url || !anonKey) throw new Error('Supabase функции не настроен.')
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Error('Требуется авторизация.')
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7))
  if (authError || !auth.user) throw new Error('Сеанс авторизации недействителен.')
  const { data: member, error: memberError } = await client.from('household_members').select('household_id, person_key').eq('user_id', auth.user.id).maybeSingle()
  if (memberError) throw new Error('Не удалось проверить доступ к семейному бюджету.')
  if (!member || (member.person_key !== 'ilya' && member.person_key !== 'masha')) throw new Error('Нет доступа к семейному бюджету.')
  return { client, householdId: member.household_id, person: member.person_key, userId: auth.user.id }
}
