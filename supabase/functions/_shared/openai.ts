function required(name: 'OPENAI_API_KEY' | 'OPENAI_STRUCTURED_MODEL' | 'OPENAI_TRANSCRIBE_MODEL'): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Не настроена переменная ${name}.`)
  return value
}

async function openAI(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`https://api.openai.com/v1/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${required('OPENAI_API_KEY')}`, ...init.headers },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(response.status === 429 ? 'Сервис распознавания перегружен. Попробуйте позже.' : 'Сервис распознавания временно недоступен.')
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Распознавание заняло слишком много времени.')
    throw error instanceof Error ? error : new Error('Не удалось выполнить распознавание.')
  } finally { clearTimeout(timer) }
}

export async function structuredResponse(input: Array<Record<string, unknown>>, schema: Record<string, unknown>): Promise<unknown> {
  const response = await openAI('responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: required('OPENAI_STRUCTURED_MODEL'),
      store: false,
      input: [{ role: 'user', content: input }],
      text: { format: { type: 'json_schema', name: 'expense_capture', strict: true, schema } },
    }),
  })
  const body: unknown = await response.json()
  const output = body && typeof body === 'object' ? (body as { output?: unknown }).output : null
  if (!Array.isArray(output)) throw new Error('Сервис вернул ответ в неизвестном формате.')
  for (const item of output) {
    if (!item || typeof item !== 'object' || !Array.isArray((item as { content?: unknown }).content)) continue
    for (const content of (item as { content: unknown[] }).content) {
      if (content && typeof content === 'object' && (content as { type?: unknown }).type === 'output_text' && typeof (content as { text?: unknown }).text === 'string') {
        try { return JSON.parse((content as { text: string }).text) } catch { throw new Error('Сервис вернул повреждённый результат.') }
      }
    }
  }
  throw new Error('Сервис не смог распознать расход.')
}

export async function transcribeRussian(file: File): Promise<string> {
  const form = new FormData()
  form.set('file', file, file.name || 'recording')
  form.set('model', required('OPENAI_TRANSCRIBE_MODEL'))
  form.set('response_format', 'json')
  form.set('language', 'ru')
  const response = await openAI('audio/transcriptions', { method: 'POST', body: form })
  const body: unknown = await response.json()
  const text = body && typeof body === 'object' ? (body as { text?: unknown }).text : null
  if (typeof text !== 'string' || !text.trim()) throw new Error('Не удалось разобрать запись. Можно заполнить расход вручную.')
  return text.trim()
}
