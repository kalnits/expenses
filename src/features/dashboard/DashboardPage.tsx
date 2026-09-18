import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { bangkokToday, calculateDebt, currentBangkokMonth, debtSentence, monthBounds, ownerLabels } from '../../app/ledger'
import { queryKeys, useHousehold } from '../../app/providers'
import type { BudgetOwner } from '../../domain/expense'
import { createBudgetRepository } from '../budgets/budgetRepository'
import { createCategoryRepository } from '../categories/categoryRepository'
import { createExpenseRepository } from '../expenses/expenseRepository'
import { createSettlementRepository } from '../settlements/settlementRepository'
import { MoneyAmount, useDisplayCurrency, useExchangeRate } from '../../lib/displayCurrency'

const owners: BudgetOwner[] = ['ilya', 'masha', 'mutual']

export function DashboardPage() {
  const { householdId } = useHousehold()
  const expenses = useQuery({ queryKey: queryKeys.expenses(householdId), queryFn: () => createExpenseRepository().list() })
  const budgets = useQuery({ queryKey: queryKeys.budgets(householdId), queryFn: () => createBudgetRepository().list() })
  const settlements = useQuery({ queryKey: queryKeys.settlements(householdId), queryFn: () => createSettlementRepository().list() })
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => createCategoryRepository().list() })
  const month = currentBangkokMonth()
  const bounds = monthBounds(month)
  const monthExpenses = (expenses.data ?? []).filter((expense) => expense.expenseDate >= bounds.start && expense.expenseDate < bounds.end)
  const categoryMap = new Map((categories.data ?? []).map((category) => [category.id, category.name]))
  const { format } = useDisplayCurrency()
  const liveRate = useExchangeRate(bangkokToday())

  if (expenses.isPending || budgets.isPending || settlements.isPending || categories.isPending) return <PageState text="Собираем картину месяца…" />
  if (expenses.isError || budgets.isError || settlements.isError || categories.isError) return <PageState error text="Не удалось загрузить сводку. Проверьте соединение и попробуйте снова." />

  const debt = calculateDebt(expenses.data, settlements.data)
  const monthDate = `${month}-01`
  return (
    <div className="page stack">
      <header className="page-header dashboard-header"><div><p className="eyebrow">{new Date(`${month}-01`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p><h1>Сводка расходов</h1><p>{debtSentence(debt, (amount) => format(amount, liveRate.data))}</p></div><Link className="button primary desktop-add" to="/add">＋ Добавить расход</Link></header>
      <section className="budget-grid" aria-label="Бюджеты месяца">
        {owners.map((owner) => {
          const budget = budgets.data.find((item) => item.month === month && item.owner === owner)
          const owned = monthExpenses.filter((expense) => expense.owner === owner)
          const spent = owned.reduce((sum, expense) => sum + expense.amountSatang, 0)
          const percent = budget?.totalLimitSatang ? Math.min(100, Math.round(spent / budget.totalLimitSatang * 100)) : 0
          return <article className="budget-card" key={owner}><div className="card-heading"><h2>{ownerLabels[owner]}</h2><span>{percent}%</span></div><p className="budget-value"><MoneyAmount amountSatang={spent} date={monthDate} /> <small>из {budget ? <MoneyAmount amountSatang={budget.totalLimitSatang} date={monthDate} /> : '—'}</small></p><div className="progress"><span style={{ width: `${percent}%` }} /></div>{budget?.categoryLimits.slice(0, 3).map((limit) => { const value = owned.filter((expense) => expense.categoryId === limit.categoryId).reduce((sum, expense) => sum + expense.amountSatang, 0); return <div className="mini-progress" key={limit.categoryId}><span>{categoryMap.get(limit.categoryId) ?? 'Категория'}</span><strong><MoneyAmount amountSatang={value} date={monthDate} /> / <MoneyAmount amountSatang={limit.limitSatang} date={monthDate} /></strong></div> })}</article>
        })}
      </section>
      <section className="section-card"><div className="section-title"><div><p className="eyebrow">Последние траты</p><h2>Что покупали</h2></div><Link to="/expenses">Все расходы</Link></div>{monthExpenses.length === 0 ? <p className="empty-text">В этом месяце расходов ещё нет.</p> : <ul className="expense-list compact">{monthExpenses.slice(0, 5).map((expense) => <li key={expense.id}><span><strong>{expense.merchant}</strong><small>{categoryMap.get(expense.categoryId) ?? 'Категория'} · {ownerLabels[expense.owner]}</small></span><strong><MoneyAmount amountSatang={expense.amountSatang} date={expense.expenseDate} rate={expense} /></strong></li>)}</ul>}</section>
      <Link className="fab" aria-label="Добавить расход" to="/add">＋</Link>
    </div>
  )
}

export function PageState({ text, error = false }: { text: string; error?: boolean }) { return <div className={`page-state ${error ? 'error-text' : ''}`} role={error ? 'alert' : 'status'}>{text}</div> }
