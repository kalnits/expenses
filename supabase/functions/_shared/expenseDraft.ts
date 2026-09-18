import type { FunctionContext } from './auth.ts'
import { structuredResponse } from './openai.ts'

type Category = { id: string; name: string; normalized_name: string }
type Rule = { category_id: string; normalized_merchant: string }

export interface ExpenseCaptureResult {
  draft: { amountSatang: number; expenseDate: string; merchant: string; notes: string; categoryId: string; owner: 'ilya' | 'masha' | 'mutual'; paidFrom: 'ilya' | 'masha' | 'mutual'; ilyaShareBps: number }
  confidence: { amount: number; merchant: number; date: number; category: number; owner: number; paidFrom: number }
  transcript?: string
  categoryEvidence?: { categoryId: string; source: 'model' | 'merchant_rule' | 'none' }
  warnings: string[]
}

export function normalizeMerchant(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

const responseSchema = {
  type: 'object', additionalProperties: false,
  required: ['amountSatang', 'expenseDate', 'merchant', 'notes', 'categoryId', 'owner', 'paidFrom', 'ilyaShareBps', 'confidence', 'warnings'],
  properties: {
    amountSatang: { type: 'integer', minimum: 0 }, expenseDate: { type: 'string' }, merchant: { type: 'string' }, notes: { type: 'string' }, categoryId: { type: 'string' },
    owner: { type: 'string', enum: ['ilya', 'masha', 'mutual'] }, paidFrom: { type: 'string', enum: ['ilya', 'masha', 'mutual'] }, ilyaShareBps: { type: 'integer', minimum: 0, maximum: 10000 },
    confidence: { type: 'object', additionalProperties: false, required: ['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom'], properties: Object.fromEntries(['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom'].map((key) => [key, { type: 'number', minimum: 0, maximum: 1 }])) },
    warnings: { type: 'array', items: { type: 'string' } },
  },
}

function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) }
function confidence(value: unknown): value is Record<string, number> { return !!value && typeof value === 'object' && ['amount', 'merchant', 'date', 'category', 'owner', 'paidFrom'].every((key) => typeof (value as Record<string, unknown>)[key] === 'number' && (value as Record<string, number>)[key] >= 0 && (value as Record<string, number>)[key] <= 1) }

function validate(value: unknown, categoryIds: Set<string>): ExpenseCaptureResult {
  if (!value || typeof value !== 'object') throw new Error('Не удалось получить корректный черновик. Заполните расход вручную.')
  const v = value as Record<string, unknown>
  if (!Number.isInteger(v.amountSatang) || (v.amountSatang as number) < 0 || !validDate(v.expenseDate) || typeof v.merchant !== 'string' || typeof v.notes !== 'string' || typeof v.categoryId !== 'string' || (v.categoryId !== '' && !categoryIds.has(v.categoryId)) || !['ilya', 'masha', 'mutual'].includes(String(v.owner)) || !['ilya', 'masha', 'mutual'].includes(String(v.paidFrom)) || !Number.isInteger(v.ilyaShareBps) || (v.ilyaShareBps as number) < 0 || (v.ilyaShareBps as number) > 10000 || !confidence(v.confidence) || !Array.isArray(v.warnings) || !v.warnings.every((item) => typeof item === 'string')) throw new Error('Не удалось получить корректный черновик. Заполните расход вручную.')
  return { draft: { amountSatang: v.amountSatang as number, expenseDate: v.expenseDate, merchant: v.merchant.trim(), notes: v.notes.trim(), categoryId: v.categoryId, owner: v.owner as ExpenseCaptureResult['draft']['owner'], paidFrom: v.paidFrom as ExpenseCaptureResult['draft']['paidFrom'], ilyaShareBps: v.ilyaShareBps as number }, confidence: v.confidence as ExpenseCaptureResult['confidence'], warnings: v.warnings as string[] }
}

async function contextData(context: FunctionContext): Promise<{ categories: Category[]; rules: Rule[] }> {
  const [categoryResult, ruleResult] = await Promise.all([
    context.client.from('categories').select('id, name, normalized_name').eq('household_id', context.householdId).eq('is_active', true),
    context.client.from('merchant_rules').select('category_id, normalized_merchant').eq('household_id', context.householdId),
  ])
  if (categoryResult.error || ruleResult.error) throw new Error('Не удалось загрузить категории для распознавания.')
  return { categories: categoryResult.data ?? [], rules: ruleResult.data ?? [] }
}

export async function extractExpense(context: FunctionContext, content: Array<Record<string, unknown>>, transcript?: string): Promise<ExpenseCaptureResult> {
  const { categories, rules } = await contextData(context)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const instructions = `Извлеки один расход. Валюта по умолчанию THB; сумму верни в сатангах (1 THB = 100), если другая валюта не указана явно — добавь предупреждение и не конвертируй. Сегодня в Asia/Bangkok: ${today}. Не выдумывай отсутствующие данные: строки оставляй пустыми, confidence ставь низкой. Для неизвестной даты используй ${today} и предупреждение. owner/paidFrom по умолчанию mutual с низкой уверенностью. Категории: ${JSON.stringify(categories.map(({ id, name }) => ({ id, name })))}. categoryId только из списка либо пустая строка. Заметки не должны содержать чековые позиции. Верни только объект схемы.`
  const raw = await structuredResponse([{ type: 'input_text', text: instructions }, ...content], responseSchema)
  const result = validate(raw, new Set(categories.map((category) => category.id)))
  const normalized = normalizeMerchant(result.draft.merchant)
  const rule = normalized ? rules.find((candidate) => candidate.normalized_merchant === normalized) : undefined
  const detectedCategory = result.draft.categoryId
  if (rule && categories.some((category) => category.id === rule.category_id)) {
    result.draft.categoryId = rule.category_id
    result.confidence.category = 1
    result.categoryEvidence = { categoryId: rule.category_id, source: 'merchant_rule' }
  } else result.categoryEvidence = { categoryId: detectedCategory, source: detectedCategory ? 'model' : 'none' }
  if (transcript) result.transcript = transcript
  return result
}
