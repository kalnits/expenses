import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { queryKeys, useHousehold } from '../../app/providers'
import { getSupabaseClient } from '../../lib/supabase'
import { createCategoryRepository } from '../categories/categoryRepository'
import { PageState } from '../dashboard/DashboardPage'
import { ExpenseDraftForm, emptyExpenseDraft, type ExpenseDraft } from '../expenses/ExpenseDraftForm'
import { ExpensePreview } from '../expenses/ExpensePreview'
import { createExpenseRepository, type ExpenseInput, type ExpenseRecord, type ExpenseRepositoryClient } from '../expenses/expenseRepository'
import { normalizeMerchant } from '../expenses/duplicate'
import { requestExchangeRate } from '../../lib/displayCurrency'
import { ReceiptCapture } from './ReceiptCapture'
import { TextCapture } from './TextCapture'
import { VoiceCapture } from './VoiceCapture'
import type { CaptureResult } from './captureClient'

type CaptureMode = 'text' | 'voice' | 'receipt' | 'manual'

async function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>, householdId: string) {
  await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.expenses(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.debt(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })])
}

export function AddExpensePage() {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const { householdId, userId } = useHousehold(); const client = getSupabaseClient()
  const repository = createExpenseRepository(client as unknown as ExpenseRepositoryClient, householdId); const categoryRepository = createCategoryRepository(client, householdId)
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => categoryRepository.list() })
  const [mode, setMode] = useState<CaptureMode>('text'); const [capture, setCapture] = useState<CaptureResult | null>(null); const [draft, setDraft] = useState<ExpenseDraft | null>(null); const [preview, setPreview] = useState(false); const [duplicate, setDuplicate] = useState<ExpenseRecord | null>(null)
  const initial = () => emptyExpenseDraft(categories.data?.find((item) => item.isActive)?.id)
  function changeMode(value: CaptureMode) { setMode(value); setCapture(null); setDraft(value === 'manual' ? initial() : null); setPreview(false); setDuplicate(null) }
  function received(result: CaptureResult) { setCapture(result); setDraft(result.draft); setPreview(false) }
  function manual(notes = '') { setMode('manual'); setCapture(null); setDraft({ ...initial(), notes }); setPreview(false) }
  const save = useMutation({ mutationFn: async ({ value, duplicateConfirmed }: { value: ExpenseDraft; duplicateConfirmed: boolean }) => {
    const normalizedMerchant = normalizeMerchant(value.merchant)
    const input: ExpenseInput = { ...value, captureMethod: mode, createdBy: userId, duplicateConfirmed, normalizedMerchant, notes: value.notes || null, ilsPerThb: null, usdPerThb: null }
    const expense = await repository.create(input)
    const detected = capture?.categoryEvidence?.categoryId
    if (detected && detected !== value.categoryId && normalizedMerchant) await categoryRepository.rememberMerchant(normalizedMerchant, value.categoryId).catch(() => undefined)
    void requestExchangeRate(expense.expenseDate, expense.id).then(() => invalidateLedger(queryClient, householdId)).catch(() => undefined)
    return expense
  }, onSuccess: async () => { await invalidateLedger(queryClient, householdId); navigate('/expenses') } })
  async function trySave(force = false) { if (!draft) return; setDuplicate(null); if (!force) { const found = await repository.findDuplicate(draft.expenseDate, draft.amountSatang, normalizeMerchant(draft.merchant)); if (found) { setDuplicate(found); return } } save.mutate({ value: draft, duplicateConfirmed: force }) }

  if (categories.isPending) return <PageState text="Загружаем категории…" />
  if (categories.isError) return <PageState error text={categories.error.message} />
  if (!categories.data.some((item) => item.isActive)) return <div className="page"><div className="section-card"><h1>Нужна категория</h1><p>Сначала создайте хотя бы одну активную категорию.</p><Link className="button primary" to="/settings">Открыть настройки</Link></div></div>
  return <div className="page narrow stack"><header className="page-header"><div><p className="eyebrow">Новая покупка</p><h1>Добавить расход</h1></div></header>
    {!draft || (!preview && mode !== 'manual' && !capture) ? <><div className="tabs capture-tabs" role="tablist" aria-label="Способ добавления">{([['text', 'Текст'], ['voice', 'Голос'], ['receipt', 'Чек'], ['manual', 'Вручную']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={mode === value} onClick={() => changeMode(value)}>{label}</button>)}</div>{mode === 'text' ? <TextCapture onResult={received} onManual={() => manual()} /> : mode === 'voice' ? <VoiceCapture onResult={received} onManual={manual} /> : mode === 'receipt' ? <ReceiptCapture onResult={received} onManual={() => manual()} /> : null}</> : null}
    {draft && !preview ? <><div className="tabs capture-tabs" role="tablist" aria-label="Способ добавления">{([['text', 'Текст'], ['voice', 'Голос'], ['receipt', 'Чек'], ['manual', 'Вручную']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={mode === value} onClick={() => changeMode(value)}>{label}</button>)}</div>{capture?.transcript ? <div className="notice"><strong>Распознанный текст:</strong> {capture.transcript}</div> : null}{capture?.warnings.map((warning) => <div className="notice" key={warning}>{warning}</div>)}<ExpenseDraftForm key={`${mode}-${capture?.transcript ?? ''}`} categories={categories.data} initialDraft={draft} confidence={capture?.confidence} onSubmit={(value) => { setDraft(value); setPreview(true) }} onCancel={() => navigate(-1)} /></> : null}
    {draft && preview ? <ExpensePreview draft={draft} categories={categories.data} isSaving={save.isPending} onBack={() => { setPreview(false); setDuplicate(null) }} onSave={() => void trySave()} /> : null}
    {duplicate && draft ? <section className="notice duplicate-warning" role="alert"><h2>Похожий расход уже есть</h2><p>{duplicate.merchant} · {(duplicate.amountSatang / 100).toLocaleString('ru-RU')} ฿ · {new Date(`${duplicate.expenseDate}T00:00:00`).toLocaleDateString('ru-RU')}</p><div className="button-row"><button className="button secondary" type="button" onClick={() => setDuplicate(null)}>Вернуться</button><button className="button primary" type="button" disabled={save.isPending} onClick={() => void trySave(true)}>Сохранить всё равно</button></div></section> : null}
    {save.isError ? <p className="error-text" role="alert">{save.error.message}</p> : null}
  </div>
}
