import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts'

type ExchangeRate = { rateDate: string; usdPerThb: number; ilsPerThb: number }
function isDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) }
function numberValue(value: unknown): number | null { const number = typeof value === 'number' ? value : Number(value); return Number.isFinite(number) && number > 0 ? number : null }
function configuration() {
  const url = Deno.env.get('SUPABASE_URL'); const anonKey = Deno.env.get('SUPABASE_ANON_KEY'); const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const appId = Deno.env.get('OPENEXCHANGERATES_APP_ID'); const appOrigin = Deno.env.get('APP_ORIGIN')
  if (!url || !anonKey || !serviceRoleKey || !appId || !appOrigin) throw new Error('Не настроены переменные функции курсов.')
  return { url, anonKey, serviceRoleKey, appId }
}
async function providerRate(date: string, appId: string): Promise<ExchangeRate> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(`https://openexchangerates.org/api/historical/${date}.json?app_id=${encodeURIComponent(appId)}&symbols=THB,ILS,USD`, { signal: controller.signal })
    if (!response.ok) throw new Error('Сервис курсов временно недоступен.')
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object') throw new Error('Сервис курсов вернул некорректные данные.')
    const data = payload as { timestamp?: unknown; rates?: { THB?: unknown; ILS?: unknown; USD?: unknown } }
    const timestamp = numberValue(data.timestamp); const thb = numberValue(data.rates?.THB); const ils = numberValue(data.rates?.ILS); const usd = numberValue(data.rates?.USD)
    if (!timestamp || !thb || !ils || !usd || new Date(timestamp * 1000).toISOString().slice(0, 10) !== date) throw new Error('Сервис курсов не подтвердил запрошенную дату.')
    return { rateDate: date, usdPerThb: 1 / thb, ilsPerThb: ils / thb }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Не удалось получить курс вовремя.')
    throw error instanceof Error ? error : new Error('Не удалось получить курс.')
  } finally { clearTimeout(timeout) }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)
  if (request.method !== 'POST') return errorResponse(request, 'Поддерживается только POST-запрос.', 405)
  try {
    const { url, anonKey, serviceRoleKey, appId } = configuration(); const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) return errorResponse(request, 'Требуется авторизация.', 401)
    const token = authorization.slice('Bearer '.length); const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } }); const { data: auth, error: authError } = await authClient.auth.getUser(token)
    if (authError || !auth.user) return errorResponse(request, 'Сеанс авторизации недействителен.', 401)
    const body: unknown = await request.json().catch(() => null); const input = body as { date?: unknown; expenseId?: unknown } | null
    if (!input || !isDate(input.date) || (input.expenseId !== undefined && (typeof input.expenseId !== 'string' || !input.expenseId))) return errorResponse(request, 'Укажите дату в формате ГГГГ-ММ-ДД.', 400)
    const service = createClient(url, serviceRoleKey); let rate: ExchangeRate | null = null
    const { data: cached, error: cacheError } = await service.from('exchange_rates').select('rate_date, usd_per_thb, ils_per_thb').eq('rate_date', input.date).maybeSingle()
    if (cacheError) throw new Error('Не удалось проверить сохранённый курс.')
    if (cached) {
      const usdPerThb = numberValue(cached.usd_per_thb); const ilsPerThb = numberValue(cached.ils_per_thb)
      if (!usdPerThb || !ilsPerThb || cached.rate_date !== input.date) throw new Error('Сохранённый курс имеет неверный формат.')
      rate = { rateDate: input.date, usdPerThb, ilsPerThb }
    } else {
      rate = await providerRate(input.date, appId)
      const { error: upsertError } = await service.from('exchange_rates').upsert({ rate_date: rate.rateDate, usd_per_thb: rate.usdPerThb, ils_per_thb: rate.ilsPerThb }, { onConflict: 'rate_date' })
      if (upsertError) throw new Error('Не удалось сохранить курс.')
    }
    if (input.expenseId) {
      const { data: expense, error: expenseError } = await service.from('expenses').select('household_id, expense_date').eq('id', input.expenseId).maybeSingle()
      if (expenseError || !expense) return errorResponse(request, 'Расход не найден.', 404)
      if (expense.expense_date !== input.date) return errorResponse(request, 'Дата расхода не совпадает с запрошенным курсом.', 400)
      const { data: member, error: memberError } = await service.from('household_members').select('user_id').eq('household_id', expense.household_id).eq('user_id', auth.user.id).maybeSingle()
      if (memberError || !member) return errorResponse(request, 'Нет доступа к этому расходу.', 403)
      const { error: updateError } = await service.from('expenses').update({ usd_per_thb: rate.usdPerThb, ils_per_thb: rate.ilsPerThb }).eq('id', input.expenseId)
      if (updateError) throw new Error('Не удалось прикрепить курс к расходу.')
    }
    return jsonResponse(request, rate)
  } catch (error) { return errorResponse(request, error instanceof Error ? error.message : 'Не удалось получить курс.', 502) }
})
