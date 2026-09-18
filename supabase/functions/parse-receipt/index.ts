import { requireHousehold } from '../_shared/auth.ts'
import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { extractExpense } from '../_shared/expenseDraft.ts'

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleOptions(request)
  if (request.method !== 'POST') return errorResponse(request, 'Поддерживается только POST-запрос.', 405)
  try {
    const context = await requireHousehold(request)
    const type = request.headers.get('content-type')?.split(';')[0].trim() ?? ''
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (!allowed.has(type) || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return errorResponse(request, 'Фото должно быть JPEG, PNG или WebP размером до 10 МБ.', 400)
    let binary = ''; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    const imageUrl = `data:${type};base64,${btoa(binary)}`
    return jsonResponse(request, await extractExpense(context, [{ type: 'input_text', text: 'Распознай итоговую сумму, магазин/место, дату. Позиции используй только как подсказки для категории и не возвращай их.' }, { type: 'input_image', image_url: imageUrl }]))
  } catch (error) { return errorResponse(request, error instanceof Error ? error.message : 'Не удалось обработать чек.', 502) }
})
