import { requireHousehold } from '../_shared/auth.ts'
import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { extractExpense } from '../_shared/expenseDraft.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleOptions(request)
  if (request.method !== 'POST') return errorResponse(request, 'Поддерживается только POST-запрос.', 405)
  try {
    const context = await requireHousehold(request)
    const body: unknown = await request.json().catch(() => null)
    const text = body && typeof body === 'object' ? (body as { text?: unknown }).text : null
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 4000) return errorResponse(request, 'Введите описание расхода длиной до 4000 символов.', 400)
    return jsonResponse(request, await extractExpense(context, [{ type: 'input_text', text: text.trim() }]))
  } catch (error) { return errorResponse(request, error instanceof Error ? error.message : 'Не удалось разобрать расход.', 502) }
})
