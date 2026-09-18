import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { currentBangkokMonth, monthBounds, ownerLabels, sourceLabels } from '../../app/ledger'
import { queryKeys, useHousehold } from '../../app/providers'
import type { BudgetOwner, PaymentSource } from '../../domain/expense'
import { getSupabaseClient } from '../../lib/supabase'
import { createCategoryRepository } from '../categories/categoryRepository'
import { PageState } from '../dashboard/DashboardPage'
import { ExpenseDraftForm, type ExpenseDraft } from './ExpenseDraftForm'
import { ExpensePreview } from './ExpensePreview'
import { createExpenseRepository, type ExpenseRecord, type ExpenseRepositoryClient } from './expenseRepository'
import { MoneyAmount, requestExchangeRate, useDisplayCurrency } from '../../lib/displayCurrency'
import { normalizeMerchant } from './duplicate'

function useExpenseData() {
  const { householdId } = useHousehold()
  const client = getSupabaseClient()
  const repository = createExpenseRepository(client as unknown as ExpenseRepositoryClient, householdId)
  const expenses = useQuery({ queryKey: queryKeys.expenses(householdId), queryFn: () => repository.list() })
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => createCategoryRepository(client, householdId).list() })
  return { householdId, repository, expenses, categories }
}

async function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>, householdId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses(householdId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debt(householdId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) }),
  ])
}

export function ExpensesPage() {
  const queryClient = useQueryClient()
  const { householdId, repository, expenses, categories } = useExpenseData()
  const [month, setMonth] = useState(currentBangkokMonth())
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState<BudgetOwner | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [paidFrom, setPaidFrom] = useState<PaymentSource | ''>('')
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)
  const [editDraft, setEditDraft] = useState<ExpenseDraft | null>(null)
  const [rememberMerchant, setRememberMerchant] = useState(false)
  const { currency } = useDisplayCurrency()
  const update = useMutation({ mutationFn: async ({ id, draft }: { id: string; draft: ExpenseDraft }) => {
    const normalizedMerchant = normalizeMerchant(draft.merchant)
    const expense = await repository.update(id, { ...draft, normalizedMerchant, notes: draft.notes || null, ilsPerThb: null, usdPerThb: null })
    if (rememberMerchant && normalizedMerchant) await createCategoryRepository(getSupabaseClient(), householdId).rememberMerchant(normalizedMerchant, draft.categoryId).catch(() => undefined)
    void requestExchangeRate(expense.expenseDate, expense.id).then(() => invalidateLedger(queryClient, householdId)).catch(() => undefined)
    return expense
  }, onSuccess: async () => { await invalidateLedger(queryClient, householdId); setEditing(null); setEditDraft(null); setRememberMerchant(false) } })
  const remove = useMutation({ mutationFn: (id: string) => repository.delete(id), onSuccess: () => invalidateLedger(queryClient, householdId) })
  const retryRate = useMutation({ mutationFn: (expense: ExpenseRecord) => requestExchangeRate(expense.expenseDate, expense.id), onSuccess: () => invalidateLedger(queryClient, householdId) })

  if (expenses.isPending || categories.isPending) return <PageState text="Загружаем расходы…" />
  if (expenses.isError || categories.isError) return <PageState error text="Не удалось загрузить расходы. Попробуйте ещё раз." />
  const bounds = monthBounds(month)
  const query = search.trim().toLocaleLowerCase('ru-RU')
  const rows = expenses.data.filter((expense) => expense.expenseDate >= bounds.start && expense.expenseDate < bounds.end && (!query || `${expense.merchant} ${expense.notes ?? ''}`.toLocaleLowerCase('ru-RU').includes(query)) && (!owner || expense.owner === owner) && (!categoryId || expense.categoryId === categoryId) && (!paidFrom || expense.paidFrom === paidFrom))
  const categoryMap = new Map(categories.data.map((item) => [item.id, item.name]))

  function beginEdit(expense: ExpenseRecord) {
    setEditing(expense)
    setEditDraft(null)
    setRememberMerchant(false)
  }

  return (
    <div className="page stack">
      <header className="page-header"><div><p className="eyebrow">Журнал</p><h1>Расходы</h1></div><Link className="button primary" to="/add">＋ Добавить</Link></header>
      <section className="filter-card stack"><div className="field-grid"><label>Месяц<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label>Поиск<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Магазин или заметка" /></label></div><div className="filter-row"><select aria-label="Чей расход" value={owner} onChange={(event) => setOwner(event.target.value as BudgetOwner | '')}><option value="">Все владельцы</option><option value="ilya">Илья</option><option value="masha">Маша</option><option value="mutual">Общие</option></select><select aria-label="Категория" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Все категории</option>{categories.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select aria-label="Источник оплаты" value={paidFrom} onChange={(event) => setPaidFrom(event.target.value as PaymentSource | '')}><option value="">Все счета</option><option value="ilya">Илья</option><option value="masha">Маша</option><option value="mutual">Общий счёт</option></select></div></section>
      {rows.length === 0 ? <section className="section-card empty-state"><h2>Ничего не найдено</h2><p>В выбранном месяце нет расходов с такими фильтрами.</p></section> : <ul className="expense-list">{rows.map((expense) => <li key={expense.id}><span><strong>{expense.merchant}</strong><small>{new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString('ru-RU')} · {categoryMap.get(expense.categoryId) ?? 'Категория'} · {ownerLabels[expense.owner]} · {sourceLabels[expense.paidFrom]}</small></span><span className="expense-actions"><strong><MoneyAmount amountSatang={expense.amountSatang} date={expense.expenseDate} rate={expense} /></strong><span><button className="text-button" type="button" onClick={() => beginEdit(expense)}>Изменить</button>{currency !== 'THB' && !expense.usdPerThb ? <button className="text-button" type="button" disabled={retryRate.isPending} onClick={() => retryRate.mutate(expense)}>Получить курс</button> : null}<button className="text-button danger" type="button" onClick={() => { if (window.confirm(`Удалить расход «${expense.merchant}»?`)) remove.mutate(expense.id) }}>Удалить</button></span></span></li>)}</ul>}
      {(remove.isError || update.isError) ? <p className="error-text" role="alert">Не удалось изменить расход. Попробуйте снова.</p> : null}
      {editing ? <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="section-title"><h2 id="edit-title">Изменить расход</h2><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setEditing(null)}>×</button></div>{editDraft ? <ExpensePreview draft={editDraft} categories={categories.data} isSaving={update.isPending} onBack={() => setEditDraft(null)} onSave={() => update.mutate({ id: editing.id, draft: editDraft })} /> : <ExpenseDraftForm categories={categories.data} initialDraft={{ amountSatang: editing.amountSatang, expenseDate: editing.expenseDate, merchant: editing.merchant, notes: editing.notes ?? '', categoryId: editing.categoryId, owner: editing.owner, paidFrom: editing.paidFrom, ilyaShareBps: editing.ilyaShareBps }} rememberMerchant={rememberMerchant} onRememberMerchantChange={setRememberMerchant} onSubmit={setEditDraft} onCancel={() => setEditing(null)} />}</div></div> : null}
    </div>
  )
}
