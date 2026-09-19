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
import type { CapturedExpense, CaptureResult } from './captureClient'
import { ExpenseComposer, type CaptureMessage, type CaptureMethod } from './ExpenseComposer'
import { ParsedExpenseCard } from './ParsedExpenseCard'

type CaptureEntry = CapturedExpense & { localId: string }
type DuplicateState = { existing: ExpenseRecord; localId: string; value: ExpenseDraft }

async function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>, householdId: string) { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.expenses(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.debt(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })]) }

export function AddExpensePage() {
  const queryClient = useQueryClient(); const { householdId, userId } = useHousehold()
  const repository = createExpenseRepository(); const categoryRepository = createCategoryRepository()
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => categoryRepository.list() })
  const [entries, setEntries] = useState<CaptureEntry[]>([])
  const [method, setMethod] = useState<CaptureMethod>('manual')
  const [message, setMessage] = useState<CaptureMessage | null>(null)
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null)
  const [success, setSuccess] = useState(false)
  const initial = () => emptyExpenseDraft(categories.data?.find((item) => item.isActive)?.id)

  function finishConversation() {
    if (message?.previewUrl) URL.revokeObjectURL(message.previewUrl)
    setMessage(null); setDuplicate(null); setMethod('manual'); setSuccess(true)
    window.setTimeout(() => setSuccess(false), 1400)
  }

  const save = useMutation({
    mutationFn: async ({ localId, value, duplicateConfirmed, detectedCategory }: { localId: string; value: ExpenseDraft; duplicateConfirmed: boolean; detectedCategory?: string }) => {
      const normalizedMerchant = normalizeMerchant(value.merchant)
      const { amountMinor, currency, ...details } = value
      const input: ExpenseInput = { ...details, originalAmountMinor: amountMinor, originalCurrency: currency, captureMethod: method, createdBy: userId, duplicateConfirmed, normalizedMerchant, notes: value.notes || null, ilsPerThb: null, usdPerThb: null }
      const expense = await repository.create(input)
      if (detectedCategory && detectedCategory !== value.categoryId && normalizedMerchant) void categoryRepository.rememberMerchant(normalizedMerchant, value.categoryId).catch(() => undefined)
      if (!expense.usdPerThb || !expense.ilsPerThb) void requestExchangeRate(expense.expenseDate, expense.id).then(() => invalidateLedger(queryClient, householdId)).catch(() => undefined)
      return { expense, localId }
    },
    onSuccess: ({ localId }) => {
      const remaining = entries.filter((entry) => entry.localId !== localId)
      setEntries(remaining); setDuplicate(null)
      if (remaining.length === 0) finishConversation()
      void invalidateLedger(queryClient, householdId)
    },
  })

  function trySave(localId: string, value: ExpenseDraft, force = false) {
    setDuplicate(null)
    const entry = entries.find((candidate) => candidate.localId === localId)
    if (!force) {
      const merchant = normalizeMerchant(value.merchant)
      const found = (queryClient.getQueryData<ExpenseRecord[]>(queryKeys.expenses(householdId)) ?? []).find((expense) => expense.expenseDate === value.expenseDate && expense.originalAmountMinor === value.amountMinor && expense.originalCurrency === value.currency && expense.normalizedMerchant === merchant)
      if (found) { setDuplicate({ existing: found, localId, value }); return }
    }
    save.mutate({ localId, value, duplicateConfirmed: force, detectedCategory: entry?.categoryEvidence?.categoryId })
  }

  function cancelEntry(localId: string) {
    const remaining = entries.filter((entry) => entry.localId !== localId)
    setEntries(remaining)
    if (duplicate?.localId === localId) setDuplicate(null)
    if (remaining.length === 0) {
      if (message?.previewUrl) URL.revokeObjectURL(message.previewUrl)
      setMessage(null); setMethod('manual')
    }
  }

  function acceptCapture(result: CaptureResult, nextMessage: CaptureMessage, nextMethod: CaptureMethod) {
    setEntries(result.expenses.map((expense) => ({ ...expense, localId: crypto.randomUUID() })))
    setMessage(nextMessage); setMethod(nextMethod); setDuplicate(null)
  }

  if (categories.isPending) return <PageState text="Готовим добавление…" />
  if (categories.isError) return <PageState error text={categories.error.message} />
  if (!categories.data.some((item) => item.isActive)) return <div className="page"><div className="modern-card"><h1>Нужна категория</h1><p>Сначала создайте хотя бы одну активную категорию.</p><Link className="button primary" to="/settings">Открыть настройки</Link></div></div>

  return <div className="capture-page">
    <header className="capture-header"><div><p className="eyebrow">Новые расходы</p><h1>Просто расскажите</h1><p>Можно назвать несколько трат сразу. Микрофон работает по удержанию.</p></div><span><ReceiptText size={24} /></span></header>
    <div className="chat-flow">
      {!message && entries.length === 0 && !success ? <div className="assistant-bubble welcome-bubble"><span className="assistant-dot"><ReceiptText size={14} /></span><p>Например: <strong>«Lotus 850, кофе 90 и Grab 220 бат»</strong></p></div> : null}
      {message ? <div className="user-bubble">{message.previewUrl ? <img src={message.previewUrl} alt="Фото чека" /> : null}<span>{message.text}</span></div> : null}
      {entries.map((entry, index) => <ParsedExpenseCard key={entry.localId} label={entries.length > 1 ? `Расход ${index + 1} из ${entries.length}` : undefined} categories={categories.data} confidence={entry.confidence} warnings={entry.warnings} draft={entry.draft} isSaving={save.isPending} onCancel={() => cancelEntry(entry.localId)} onSave={(value) => trySave(entry.localId, value)} />)}
      {duplicate ? <div className="assistant-bubble duplicate-chat" role="alert"><strong>Похожий расход уже есть</strong><p>{duplicate.existing.merchant} · {(duplicate.existing.amountSatang / 100).toLocaleString('ru-RU')} ฿</p><div className="button-row"><button className="button secondary" type="button" onClick={() => setDuplicate(null)}>Вернуться</button><button className="button primary" type="button" onClick={() => void trySave(duplicate.localId, duplicate.value, true)}>Сохранить всё равно</button></div></div> : null}
      {success ? <div className="success-bubble"><Check size={19} /> Все расходы сохранены</div> : null}
      {save.isError ? <div className="composer-error" role="alert">{save.error.message}</div> : null}
    </div>
    <ExpenseComposer disabled={entries.length > 0 || success || save.isPending} onCaptured={acceptCapture} onManual={(notes = '') => { setMessage(null); setMethod('manual'); setEntries([{ localId: crypto.randomUUID(), draft: { ...initial(), notes }, confidence: { amount: 1, merchant: 1, date: 1, category: 1, owner: 1, paidFrom: 1 }, warnings: [] }]) }} />
  </div>
}
