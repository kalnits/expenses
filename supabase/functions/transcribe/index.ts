import { requireHousehold } from '../_shared/auth.ts'
import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { extractExpense } from '../_shared/expenseDraft.ts'
import { transcribeRussian } from '../_shared/openai.ts'

const allowed = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleOptions(request)
  if (request.method !== 'POST') return errorResponse(request, 'Поддерживается только POST-запрос.', 405)
  let transcript: string | undefined
  try {
    const context = await requireHousehold(request)
    const form = await request.formData(); const value = form.get('audio')
    if (!(value instanceof File) || !allowed.has(value.type) || value.size <= 0 || value.size > 15 * 1024 * 1024) return errorResponse(request, 'Запись должна быть WebM, MP4, MP3 или WAV размером до 15 МБ.', 400)
    transcript = await transcribeRussian(value)
    return jsonResponse(request, await extractExpense(context, [{ type: 'input_text', text: transcript }], transcript))
  } catch (error) { return errorResponse(request, error instanceof Error ? error.message : 'Не удалось обработать запись.', 502, transcript ? { transcript } : {}) }
})
