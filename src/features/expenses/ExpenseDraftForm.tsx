/* eslint-disable react-refresh/only-export-components */
import { useState, type FormEvent } from 'react'

import type { BudgetOwner, PaymentSource } from '../../domain/expense'
import { parseThb } from '../../domain/money'
import { bangkokToday, ownerLabels, sourceLabels } from '../../app/ledger'
import type { CategoryRecord } from '../categories/categoryRepository'

export interface ExpenseDraft {
  amountSatang: number
  expenseDate: string
  merchant: string
  notes: string
  categoryId: string
  owner: BudgetOwner
  paidFrom: PaymentSource
  ilyaShareBps: number
}

export function emptyExpenseDraft(categoryId = ''): ExpenseDraft {
  return { amountSatang: 0, expenseDate: bangkokToday(), merchant: '', notes: '', categoryId, owner: 'mutual', paidFrom: 'mutual', ilyaShareBps: 5000 }
}

interface Props {
  categories: CategoryRecord[]
  initialDraft?: ExpenseDraft
  submitLabel?: string
  onSubmit: (draft: ExpenseDraft) => void
  onCancel?: () => void
}

export function ExpenseDraftForm({ categories, initialDraft, submitLabel = 'Продолжить', onSubmit, onCancel }: Props) {
  const start = initialDraft ?? emptyExpenseDraft(categories[0]?.id)
  const [amount, setAmount] = useState(start.amountSatang ? String(start.amountSatang / 100) : '')
  const [draft, setDraft] = useState(start)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const amountSatang = parseThb(amount.replace(',', '.').trim())
      if (!draft.merchant.trim()) throw new Error('Укажите магазин или место.')
      if (!draft.categoryId) throw new Error('Выберите категорию.')
      if (!draft.expenseDate) throw new Error('Укажите дату.')
      onSubmit({
        ...draft,
        amountSatang,
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
      <div className="amount-field">
        <label htmlFor="expense-amount">Сумма</label>
        <div className="amount-input"><input id="expense-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /><span>฿</span></div>
      </div>
      <div className="field-grid">
        <label>Дата<input type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></label>
        <label>Категория<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">Выберите</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      </div>
      <label>Магазин или место<input value={draft.merchant} onChange={(event) => setDraft({ ...draft, merchant: event.target.value })} placeholder="Например, Lotus's" /></label>
      <fieldset><legend>Чей расход</legend><div className="segmented">{(['ilya', 'masha', 'mutual'] as BudgetOwner[]).map((owner) => <label key={owner}><input type="radio" name="owner" checked={draft.owner === owner} onChange={() => setDraft({ ...draft, owner, ilyaShareBps: owner === 'ilya' ? 10000 : owner === 'masha' ? 0 : 5000 })} /><span>{ownerLabels[owner]}</span></label>)}</div></fieldset>
      <fieldset><legend>Откуда оплачено</legend><div className="segmented">{(['ilya', 'masha', 'mutual'] as PaymentSource[]).map((paidFrom) => <label key={paidFrom}><input type="radio" name="paid" checked={draft.paidFrom === paidFrom} onChange={() => setDraft({ ...draft, paidFrom })} /><span>{sourceLabels[paidFrom]}</span></label>)}</div></fieldset>
      {draft.owner === 'mutual' ? <label>Доля Ильи: {Math.round(draft.ilyaShareBps / 100)}%<input type="range" min="0" max="10000" step="500" value={draft.ilyaShareBps} onChange={(event) => setDraft({ ...draft, ilyaShareBps: Number(event.target.value) })} /></label> : null}
      <label>Заметка<textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Необязательно" /></label>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <div className="button-row">{onCancel ? <button className="button secondary" type="button" onClick={onCancel}>Отмена</button> : null}<button className="button primary" type="submit">{submitLabel}</button></div>
    </form>
  )
}
