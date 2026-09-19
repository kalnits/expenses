import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { currentBangkokMonth, monthBounds, ownerLabels, previousMonth } from '../../app/ledger'
import { queryKeys, useHousehold } from '../../app/providers'
import type { MonthlyBudget } from '../../domain/budget'
import type { BudgetOwner } from '../../domain/expense'
import { createCategoryRepository, type CategoryRecord } from '../categories/categoryRepository'
import { PageState } from '../dashboard/DashboardPage'
import { createExpenseRepository, type ExpenseRecord } from '../expenses/expenseRepository'
import { createBudgetRepository } from './budgetRepository'
import { MoneyAmount } from '../../lib/displayCurrency'

const owners: BudgetOwner[] = ['mutual', 'ilya', 'masha']

function parseLimit(value: string): number {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return 0
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0 || Math.round(number * 100) !== number * 100) throw new Error('Введите сумму с точностью до сатанга.')
  return Math.round(number * 100)
}

function BudgetEditor({ month, owner, initial, copied, categories, expenses, onSave, saving }: { month: string; owner: BudgetOwner; initial?: MonthlyBudget; copied: boolean; categories: CategoryRecord[]; expenses: ExpenseRecord[]; onSave: (budget: MonthlyBudget) => void; saving: boolean }) {
  const [total, setTotal] = useState(initial?.totalLimitSatang ? String(initial.totalLimitSatang / 100) : '')
  const [limits, setLimits] = useState<Record<string, string>>(() => Object.fromEntries((initial?.categoryLimits ?? []).map((limit) => [limit.categoryId, String(limit.limitSatang / 100)])))
  const [error, setError] = useState<string | null>(null)
  const bounds = monthBounds(month)
  const owned = expenses.filter((expense) => expense.owner === owner && expense.expenseDate >= bounds.start && expense.expenseDate < bounds.end)
  const spent = owned.reduce((sum, item) => sum + item.amountSatang, 0)

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      onSave({ month, owner, totalLimitSatang: parseLimit(total), categoryLimits: categories.map((category) => ({ categoryId: category.id, limitSatang: parseLimit(limits[category.id] ?? '') })).filter((limit) => limit.limitSatang > 0) })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Проверьте суммы.') }
  }

  return <form className="section-card stack" onSubmit={submit}>{copied ? <div className="notice">Показаны лимиты прошлого месяца. Они сохранятся только после нажатия «Сохранить».</div> : null}<div className="budget-total"><div><span>Потрачено</span><strong><MoneyAmount amountSatang={spent} date={`${month}-01`} /></strong></div><label>Общий лимит<input inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0" /></label></div><div className="progress"><span style={{ width: `${initial?.totalLimitSatang ? Math.min(100, spent / initial.totalLimitSatang * 100) : 0}%` }} /></div><div className="category-limits"><h2>Лимиты по категориям</h2>{categories.map((category) => { const categorySpent = owned.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amountSatang, 0); return <label key={category.id}><span>{category.name}<small>Потрачено <MoneyAmount amountSatang={categorySpent} date={`${month}-01`} /></small></span><span className="money-field"><input inputMode="decimal" value={limits[category.id] ?? ''} onChange={(event) => setLimits({ ...limits, [category.id]: event.target.value })} placeholder="0" /><i>฿</i></span></label> })}</div>{error ? <p className="error-text" role="alert">{error}</p> : null}<button className="button primary" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить бюджет'}</button></form>
}

export function BudgetsPage() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(currentBangkokMonth())
  const [owner, setOwner] = useState<BudgetOwner>('mutual')
  const repository = createBudgetRepository()
  const budgets = useQuery({ queryKey: queryKeys.budgets(householdId), queryFn: () => repository.list() })
  const expenses = useQuery({ queryKey: queryKeys.expenses(householdId), queryFn: () => createExpenseRepository().list() })
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => createCategoryRepository().list() })
  const save = useMutation({ mutationFn: (budget: MonthlyBudget) => repository.save(budget), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })]) } })

  if (budgets.isPending || expenses.isPending || categories.isPending) return <PageState text="Загружаем бюджеты…" />
  if (budgets.isError || expenses.isError || categories.isError) return <PageState error text="Не удалось загрузить бюджеты." />
  const exact = budgets.data.find((item) => item.month === month && item.owner === owner)
  const prior = budgets.data.find((item) => item.month === previousMonth(month) && item.owner === owner)
  const initial = exact ?? (prior ? { ...prior, month } : undefined)
  const activeCategories = categories.data.filter((item) => item.isActive)

  return <div className="page stack"><header className="page-header"><div><p className="eyebrow">Планы</p><h1>{owner === 'mutual' ? 'Общий бюджет' : `Бюджет · ${ownerLabels[owner]}`}</h1></div><label className="month-control">Месяц<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></header><div className="tabs budget-tabs" role="tablist">{owners.map((item) => <button key={item} className={item === 'mutual' ? 'main-budget-tab' : undefined} type="button" role="tab" aria-selected={owner === item} onClick={() => setOwner(item)}>{ownerLabels[item]}</button>)}</div><BudgetEditor key={`${month}-${owner}-${exact ? 'saved' : 'draft'}`} month={month} owner={owner} initial={initial} copied={!exact && Boolean(prior)} categories={activeCategories} expenses={expenses.data} onSave={(budget) => save.mutate(budget)} saving={save.isPending} />{save.isError ? <p className="error-text" role="alert">{save.error.message}</p> : null}</div>
}
