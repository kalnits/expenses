/* eslint-disable react-refresh/only-export-components */
import { useState, type FormEvent } from 'react'

import type { BudgetOwner, ExpenseCurrency, PaymentSource } from '../../domain/expense'
import { parseMoneyMinor } from '../../domain/money'
import { bangkokToday, ownerLabels, sourceLabels } from '../../app/ledger'
import type { CategoryRecord } from '../categories/categoryRepository'
import type { CaptureConfidence } from '../capture/captureClient'

export interface ExpenseDraft {
  amountMinor: number
  currency: ExpenseCurrency
  expenseDate: string
  merchant: string
  notes: string
  categoryId: string
  owner: BudgetOwner
  paidFrom: PaymentSource
  ilyaShareBps: number
}

export function emptyExpenseDraft(categoryId = ''): ExpenseDraft {
  return { amountMinor: 0, currency: 'THB', expenseDate: bangkokToday(), merchant: '', notes: '', categoryId, owner: 'mutual', paidFrom: 'mutual', ilyaShareBps: 5000 }
}

interface Props {
  categories: CategoryRecord[]
  initialDraft?: ExpenseDraft
  submitLabel?: string
  onSubmit: (draft: ExpenseDraft) => void
  onCancel?: () => void
  confidence?: CaptureConfidence
  rememberMerchant?: boolean
  onRememberMerchantChange?: (value: boolean) => void
}

const LOW_CONFIDENCE = .7
function CheckValue({ value }: { value: number | undefined }) { return value !== undefined && value < LOW_CONFIDENCE ? <small className="confidence-warning">Проверьте значение</small> : null }

export function ExpenseDraftForm({ categories, initialDraft, submitLabel = 'Продолжить', onSubmit, onCancel, confidence, rememberMerchant, onRememberMerchantChange }: Props) {
  const start = initialDraft ?? emptyExpenseDraft(categories[0]?.id)
  const [amount, setAmount] = useState(start.amountMinor ? String(start.amountMinor / 100) : '')
  const [draft, setDraft] = useState(start)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const amountMinor = parseMoneyMinor(amount.replace(',', '.').trim())
      if (!draft.merchant.trim()) throw new Error('Укажите магазин или место.')
      if (!draft.categoryId) throw new Error('Выберите категорию.')
      if (!draft.expenseDate) throw new Error('Укажите дату.')
      onSubmit({
        ...draft,
        amountMinor,
        merchant: draft.merchant.trim(),
        notes: draft.notes.trim(),
        ilyaShareBps: draft.owner === 'ilya' ? 10000 : draft.owner === 'masha' ? 0 : draft.ilyaShareBps,
      })
    } catch (caught) {
      setError(caught instanceof Error && caught.message.startsWith('Укажите') ? caught.message : 'Введите положительную сумму, например 250 или 250,50.')
    }
  }

  return (
    <form className="stack form-card" onSubmit={submit}>
      <div className={`amount-field ${confidence && confidence.amount < LOW_CONFIDENCE ? 'low-confidence' : ''}`}>
        <label htmlFor="expense-amount">Сумма</label>
        <div className="amount-input currency-amount"><input id="expense-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /><select aria-label="Валюта расхода" value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as ExpenseCurrency })}><option value="THB">฿</option><option value="ILS">₪</option><option value="USD">$</option></select></div>
        <CheckValue value={confidence?.amount} />
      </div>
      <div className="field-grid">
        <label className={confidence && confidence.date < LOW_CONFIDENCE ? 'low-confidence' : ''}>Дата<input type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /><CheckValue value={confidence?.date} /></label>
        <label className={confidence && confidence.category < LOW_CONFIDENCE ? 'low-confidence' : ''}>Категория<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Выберите</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><CheckValue value={confidence?.category} /></label>
      </div>
      <label className={confidence && confidence.merchant < LOW_CONFIDENCE ? 'low-confidence' : ''}>Магазин или место<input value={draft.merchant} onChange={(event) => setDraft({ ...draft, merchant: event.target.value })} placeholder="Например, Lotus's" /><CheckValue value={confidence?.merchant} /></label>
      <fieldset className={confidence && confidence.owner < LOW_CONFIDENCE ? 'low-confidence' : ''}><legend>Чей расход</legend><div className="segmented">{(['ilya', 'masha', 'mutual'] as BudgetOwner[]).map((owner) => <label key={owner}><input type="radio" name="owner" checked={draft.owner === owner} onChange={() => setDraft({ ...draft, owner, ilyaShareBps: owner === 'ilya' ? 10000 : owner === 'masha' ? 0 : 5000 })} /><span>{ownerLabels[owner]}</span></label>)}</div><CheckValue value={confidence?.owner} /></fieldset>
      <fieldset className={confidence && confidence.paidFrom < LOW_CONFIDENCE ? 'low-confidence' : ''}><legend>Откуда оплачено</legend><div className="segmented">{(['ilya', 'masha', 'mutual'] as PaymentSource[]).map((paidFrom) => <label key={paidFrom}><input type="radio" name="paid" checked={draft.paidFrom === paidFrom} onChange={() => setDraft({ ...draft, paidFrom })} /><span>{sourceLabels[paidFrom]}</span></label>)}</div><CheckValue value={confidence?.paidFrom} /></fieldset>
      {draft.owner === 'mutual' ? <label>Доля Ильи: {Math.round(draft.ilyaShareBps / 100)}%<input type="range" min="0" max="10000" step="500" value={draft.ilyaShareBps} onChange={(event) => setDraft({ ...draft, ilyaShareBps: Number(event.target.value) })} /></label> : null}
      <label>Заметка<textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Необязательно" /></label>
      {onRememberMerchantChange ? <label className="checkbox-row"><input type="checkbox" checked={rememberMerchant ?? false} onChange={(event) => onRememberMerchantChange(event.target.checked)} />Запомнить для этого магазина</label> : null}
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <div className="button-row">{onCancel ? <button className="button secondary" type="button" onClick={onCancel}>Отмена</button> : null}<button className="button primary" type="submit">{submitLabel}</button></div>
    </form>
  )
}
