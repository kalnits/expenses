import { Check, ChevronDown } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { ownerLabels, sourceLabels } from '../../app/ledger'
import type { BudgetOwner, PaymentSource } from '../../domain/expense'
import { parseThb } from '../../domain/money'
import type { CategoryRecord } from '../categories/categoryRepository'
import type { ExpenseDraft } from '../expenses/ExpenseDraftForm'
import type { CaptureConfidence } from './captureClient'

interface Props {
  categories: CategoryRecord[]
  confidence?: CaptureConfidence
  draft: ExpenseDraft
  isSaving: boolean
  onSave: (draft: ExpenseDraft) => void
  warnings?: string[]
}

export function ParsedExpenseCard({ categories, confidence, draft: initial, isSaving, onSave, warnings = [] }: Props) {
  const [draft, setDraft] = useState(initial)
  const [amount, setAmount] = useState(initial.amountSatang ? String(initial.amountSatang / 100) : '')
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault(); setError(null)
    try {
      const amountSatang = parseThb(amount.replace(',', '.').trim())
      if (!draft.merchant.trim() || !draft.categoryId || !draft.expenseDate) throw new Error('Проверьте место, категорию и дату.')
      onSave({ ...draft, amountSatang, merchant: draft.merchant.trim(), notes: draft.notes.trim(), ilyaShareBps: draft.owner === 'ilya' ? 10000 : draft.owner === 'masha' ? 0 : draft.ilyaShareBps })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Проверьте данные расхода.') }
  }

  return <form className="assistant-bubble parsed-card" onSubmit={submit}>
    <div className="parsed-label"><span className="assistant-dot"><Check size={13} /></span><span>Готово к сохранению</span></div>
    <div className={`parsed-amount${confidence && confidence.amount < .7 ? ' needs-check' : ''}`}><input aria-label="Сумма" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>฿</span></div>
    <input className={confidence && confidence.merchant < .7 ? 'needs-check' : ''} aria-label="Магазин или место" value={draft.merchant} onChange={(event) => setDraft({ ...draft, merchant: event.target.value })} placeholder="Магазин или место" />
    <div className="parsed-grid">
      <label className={confidence && confidence.category < .7 ? 'needs-check' : ''}><span>Категория</span><select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Выберите</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className={confidence && confidence.date < .7 ? 'needs-check' : ''}><span>Дата</span><input type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></label>
    </div>
    <button className="parsed-expand" type="button" onClick={() => setExpanded(!expanded)}>Оплата и детали <ChevronDown size={17} className={expanded ? 'rotated' : ''} /></button>
    {expanded ? <div className="parsed-extra">
      <label>Чей бюджет<select value={draft.owner} onChange={(event) => { const owner = event.target.value as BudgetOwner; setDraft({ ...draft, owner, ilyaShareBps: owner === 'ilya' ? 10000 : owner === 'masha' ? 0 : 5000 }) }}>{(['mutual', 'ilya', 'masha'] as BudgetOwner[]).map((owner) => <option key={owner} value={owner}>{ownerLabels[owner]}</option>)}</select></label>
      <label>Оплачено<select value={draft.paidFrom} onChange={(event) => setDraft({ ...draft, paidFrom: event.target.value as PaymentSource })}>{(['mutual', 'ilya', 'masha'] as PaymentSource[]).map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</select></label>
      {draft.owner === 'mutual' ? <label className="share-slider">Доля Ильи: {Math.round(draft.ilyaShareBps / 100)}%<input type="range" min="0" max="10000" step="500" value={draft.ilyaShareBps} onChange={(event) => setDraft({ ...draft, ilyaShareBps: Number(event.target.value) })} /></label> : null}
      <label className="full-field">Заметка<textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Необязательно" /></label>
    </div> : null}
    {warnings.map((warning) => <p className="inline-warning" key={warning}>{warning}</p>)}
    {error ? <p className="error-text" role="alert">{error}</p> : null}
    <button className="button save-expense" type="submit" disabled={isSaving}>{isSaving ? 'Сохраняем…' : 'Сохранить расход'}</button>
  </form>
}
