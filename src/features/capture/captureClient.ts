import { z } from 'zod'

import { getSupabaseClient } from '../../lib/supabase'
import type { ExpenseDraft } from '../expenses/ExpenseDraftForm'

const draftSchema = z.object({
  amountSatang: z.number().int().nonnegative(), expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), merchant: z.string(), notes: z.string(), categoryId: z.string(),
  owner: z.enum(['ilya', 'masha', 'mutual']), paidFrom: z.enum(['ilya', 'masha', 'mutual']), ilyaShareBps: z.number().int().min(0).max(10000),
}).strict()
const confidenceSchema = z.object({ amount: z.number().min(0).max(1), merchant: z.number().min(0).max(1), date: z.number().min(0).max(1), category: z.number().min(0).max(1), owner: z.number().min(0).max(1), paidFrom: z.number().min(0).max(1) }).strict()
const resultSchema = z.object({
  draft: draftSchema, confidence: confidenceSchema, transcript: z.string().optional(),
  categoryEvidence: z.object({ categoryId: z.string(), source: z.enum(['model', 'merchant_rule', 'none']) }).strict().optional(), warnings: z.array(z.string()),
}).strict()

export type CaptureConfidence = z.infer<typeof confidenceSchema>
export type CaptureResult = Omit<z.infer<typeof resultSchema>, 'draft'> & { draft: ExpenseDraft }

export class CaptureError extends Error {
  transcript?: string
  constructor(message: string, transcript?: string) { super(message); this.name = 'CaptureError'; this.transcript = transcript }
}

type Environment = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string }
async function invoke(name: string, body: BodyInit, signal?: AbortSignal, contentType?: string): Promise<CaptureResult> {
  const environment = (import.meta as ImportMeta & { env: Environment }).env
  const url = environment.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = environment.VITE_SUPABASE_ANON_KEY
  const { data } = await getSupabaseClient().auth.getSession()
  if (!url || !anonKey || !data.session) throw new CaptureError('Сеанс истёк. Войдите снова, чтобы распознать расход.')
  const response = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', body, signal, headers: { apikey: anonKey, Authorization: `Bearer ${data.session.access_token}`, ...(contentType ? { 'Content-Type': contentType } : {}) } })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const details = payload && typeof payload === 'object' ? payload as { error?: unknown; transcript?: unknown } : null
    throw new CaptureError(typeof details?.error === 'string' ? details.error : 'Не удалось распознать расход. Заполните его вручную.', typeof details?.transcript === 'string' ? details.transcript : undefined)
  }
  const parsed = resultSchema.safeParse(payload)
  if (!parsed.success) throw new CaptureError('Результат распознавания повреждён. Заполните расход вручную.')
  return parsed.data
}

export function parseText(text: string, signal?: AbortSignal): Promise<CaptureResult> { return invoke('parse-text', JSON.stringify({ text }), signal, 'application/json') }
export function parseVoice(audio: Blob, signal?: AbortSignal): Promise<CaptureResult> { const form = new FormData(); form.set('audio', audio, 'expense.webm'); return invoke('transcribe', form, signal) }
export function parseReceipt(image: Blob, signal?: AbortSignal): Promise<CaptureResult> { return invoke('parse-receipt', image, signal, image.type) }

export async function downsizeReceipt(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new CaptureError('Выберите изображение JPEG, PNG или WebP.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d'); if (!context) { bitmap.close(); throw new CaptureError('Не удалось подготовить фото.') }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  const type = file.type === 'image/png' && file.size <= 10 * 1024 * 1024 ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, .84))
  canvas.width = 1; canvas.height = 1
  if (!blob || blob.size > 10 * 1024 * 1024) throw new CaptureError('Фото слишком большое. Попробуйте снять чек ближе.')
  return blob
}
