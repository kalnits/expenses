import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { queryKeys, useHousehold } from '../../app/providers'
import { requestExchangeRate } from '../../lib/displayCurrency'
import { createCategoryRepository } from '../categories/categoryRepository'
import { PageState } from '../dashboard/DashboardPage'
import { emptyExpenseDraft, type ExpenseDraft } from '../expenses/ExpenseDraftForm'
import { createExpenseRepository, type ExpenseInput, type ExpenseRecord } from '../expenses/expenseRepository'
import { normalizeMerchant } from '../expenses/duplicate'
import type { CaptureResult } from './captureClient'
import { ExpenseComposer, type CaptureMessage, type CaptureMethod } from './ExpenseComposer'
import { ParsedExpenseCard } from './ParsedExpenseCard'

async function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>, householdId: string) { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.expenses(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.debt(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })]) }

export function AddExpensePage() {
  const queryClient = useQueryClient(); const { householdId, userId } = useHousehold()
  const repository = createExpenseRepository(); const categoryRepository = createCategoryRepository()
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => categoryRepository.list() })
  const [capture, setCapture] = useState<CaptureResult | null>(null)
  const [draft, setDraft] = useState<ExpenseDraft | null>(null)
  const [method, setMethod] = useState<CaptureMethod>('manual')
  const [message, setMessage] = useState<CaptureMessage | null>(null)
  const [duplicate, setDuplicate] = useState<ExpenseRecord | null>(null)
  const [success, setSuccess] = useState(false)
  const initial = () => emptyExpenseDraft(categories.data?.find((item) => item.isActive)?.id)

  function reset() { if (message?.previewUrl) URL.revokeObjectURL(message.previewUrl); setCapture(null); setDraft(null); setMessage(null); setDuplicate(null); setMethod('manual') }
  const save = useMutation({ mutationFn: async ({ value, duplicateConfirmed }: { value: ExpenseDraft; duplicateConfirmed: boolean }) => { const normalizedMerchant = normalizeMerchant(value.merchant); const input: ExpenseInput = { ...value, captureMethod: method, createdBy: userId, duplicateConfirmed, normalizedMerchant, notes: value.notes || null, ilsPerThb: null, usdPerThb: null }; const expense = await repository.create(input); const detected = capture?.categoryEvidence?.categoryId; if (detected && detected !== value.categoryId && normalizedMerchant) await categoryRepository.rememberMerchant(normalizedMerchant, value.categoryId).catch(() => undefined); void requestExchangeRate(expense.expenseDate, expense.id).then(() => invalidateLedger(queryClient, householdId)).catch(() => undefined); return expense }, onSuccess: async () => { await invalidateLedger(queryClient, householdId); setSuccess(true); reset(); window.setTimeout(() => setSuccess(false), 1400) } })
  async function trySave(value: ExpenseDraft, force = false) { setDraft(value); setDuplicate(null); if (!force) { const found = await repository.findDuplicate(value.expenseDate, value.amountSatang, normalizeMerchant(value.merchant)); if (found) { setDuplicate(found); return } } save.mutate({ value, duplicateConfirmed: force }) }

  if (categories.isPending) return <PageState text="Готовим добавление…" />
  if (categories.isError) return <PageState error text={categories.error.message} />
  if (!categories.data.some((item) => item.isActive)) return <div className="page"><div className="modern-card"><h1>Нужна категория</h1><p>Сначала создайте хотя бы одну активную категорию.</p><Link className="button primary" to="/settings">Открыть настройки</Link></div></div>

  return <div className="capture-page">
    <header className="capture-header"><div><p className="eyebrow">Новый расход</p><h1>Просто расскажите</h1><p>Напишите, скажите голосом или сфотографируйте чек.</p></div><span><ReceiptText size={24} /></span></header>
    <div className="chat-flow">
      {!message && !draft && !success ? <div className="assistant-bubble welcome-bubble"><span className="assistant-dot"><ReceiptText size={14} /></span><p>Например: <strong>«850 бат в Lotus’s, продукты, с общей карты»</strong></p></div> : null}
      {message ? <div className="user-bubble">{message.previewUrl ? <img src={message.previewUrl} alt="Фото чека" /> : null}<span>{message.text}</span></div> : null}
      {draft ? <ParsedExpenseCard key={`${method}-${message?.text ?? 'manual'}`} categories={categories.data} confidence={capture?.confidence} warnings={capture?.warnings} draft={draft} isSaving={save.isPending} onSave={(value) => void trySave(value)} /> : null}
      {duplicate && draft ? <div className="assistant-bubble duplicate-chat" role="alert"><strong>Похожий расход уже есть</strong><p>{duplicate.merchant} · {(duplicate.amountSatang / 100).toLocaleString('ru-RU')} ฿</p><div className="button-row"><button className="button secondary" type="button" onClick={() => setDuplicate(null)}>Вернуться</button><button className="button primary" type="button" onClick={() => void trySave(draft, true)}>Сохранить всё равно</button></div></div> : null}
      {success ? <div className="success-bubble"><Check size={19} /> Расход сохранён</div> : null}
      {save.isError ? <div className="composer-error" role="alert">{save.error.message}</div> : null}
    </div>
    <ExpenseComposer disabled={Boolean(draft) || success || save.isPending} onCaptured={(result, nextMessage, nextMethod) => { setCapture(result); setDraft(result.draft); setMessage(nextMessage); setMethod(nextMethod) }} onManual={(notes = '') => { setCapture(null); setMessage(null); setMethod('manual'); setDraft({ ...initial(), notes }) }} />
  </div>
}
