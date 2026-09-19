import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, ChevronDown, Plus, Sparkles, TrendingUp, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'

import { bangkokToday, calculateDebt, currentBangkokMonth, debtSentence, monthBounds, ownerLabels } from '../../app/ledger'
import { queryKeys, useHousehold } from '../../app/providers'
import { expenseAmountInBudgetMinor, resolveMonthlyBudget } from '../../domain/budget'
import type { BudgetOwner } from '../../domain/expense'
import { BudgetMoneyAmount, MoneyAmount, useDisplayCurrency, useExchangeRate } from '../../lib/displayCurrency'
import { createBudgetRepository } from '../budgets/budgetRepository'
import { createCategoryRepository } from '../categories/categoryRepository'
import { createExpenseRepository } from '../expenses/expenseRepository'
import { createSettlementRepository } from '../settlements/settlementRepository'

const personalOwners: BudgetOwner[] = ['ilya', 'masha']

export function DashboardPage() {
  const { householdId } = useHousehold()
  const expenses = useQuery({ queryKey: queryKeys.expenses(householdId), queryFn: () => createExpenseRepository().list() })
  const budgets = useQuery({ queryKey: queryKeys.budgets(householdId), queryFn: () => createBudgetRepository().list() })
  const settlements = useQuery({ queryKey: queryKeys.settlements(householdId), queryFn: () => createSettlementRepository().list() })
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => createCategoryRepository().list() })
  const month = currentBangkokMonth()
  const bounds = monthBounds(month)
  const { format } = useDisplayCurrency()
  const liveRate = useExchangeRate(bangkokToday())

  if (expenses.isPending || budgets.isPending || settlements.isPending || categories.isPending) return <DashboardSkeleton />
  if (expenses.isError || budgets.isError || settlements.isError || categories.isError) return <PageState error text="Не удалось загрузить сводку. Проверьте соединение и попробуйте снова." />

  const monthExpenses = expenses.data.filter((expense) => expense.expenseDate >= bounds.start && expense.expenseDate < bounds.end)
  const mutualExpenses = monthExpenses.filter((expense) => expense.owner === 'mutual')
  const mutualBudget = resolveMonthlyBudget(budgets.data, month, 'mutual')
  const budgetCurrency = mutualBudget?.currency ?? 'THB'
  const mutualBudgetAmounts = mutualExpenses.map((expense) => expenseAmountInBudgetMinor(expense.amountSatang, budgetCurrency, expense.ilsPerThb))
  const mutualSpent = mutualBudgetAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
  const missingBudgetRates = mutualBudgetAmounts.filter((amount) => amount === null).length
  const totalSpent = monthExpenses.reduce((sum, expense) => sum + expense.amountSatang, 0)
  const remaining = Math.max(0, (mutualBudget?.totalLimitSatang ?? 0) - mutualSpent)
  const budgetOverage = Math.max(0, mutualSpent - (mutualBudget?.totalLimitSatang ?? 0))
  const isBudgetExceeded = budgetOverage > 0
  const progress = mutualBudget?.totalLimitSatang ? Math.round(mutualSpent / mutualBudget.totalLimitSatang * 100) : 0
  const categoryMap = new Map(categories.data.map((category) => [category.id, category.name]))
  const allCategoryRows = (mutualBudget?.categoryLimits ?? []).map((limit) => ({ ...limit, spent: mutualExpenses.filter((expense) => expense.categoryId === limit.categoryId).reduce((sum, expense) => sum + (expenseAmountInBudgetMinor(expense.amountSatang, budgetCurrency, expense.ilsPerThb) ?? 0), 0) })).sort((a, b) => (b.limitSatang ? b.spent / b.limitSatang : 0) - (a.limitSatang ? a.spent / a.limitSatang : 0))
  const exceededCategories = allCategoryRows.filter((row) => row.limitSatang > 0 && row.spent > row.limitSatang)
  const categoryOverage = exceededCategories.reduce((sum, row) => sum + row.spent - row.limitSatang, 0)
  const categoryRows = allCategoryRows.slice(0, 4)
  const debt = calculateDebt(expenses.data, settlements.data)
  const monthDate = `${month}-01`

  return <div className="page dashboard-page stack">
    <header className="dashboard-top"><div><p className="eyebrow">{new Date(monthDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p><h1>Наши расходы</h1></div><Link className="round-action" to="/add" aria-label="Добавить расход"><Plus size={22} /></Link></header>

    <section className={`mutual-hero${isBudgetExceeded ? ' budget-exceeded' : ''}`}>
      <div className="hero-glow" />
      <div className="hero-kicker"><span>{isBudgetExceeded ? <AlertTriangle size={15} /> : <Sparkles size={15} />} {isBudgetExceeded ? 'Бюджет превышен' : 'Общий бюджет'}</span><strong>{progress}%</strong></div>
      <div className="hero-amount">{mutualBudget ? <BudgetMoneyAmount amountMinor={mutualSpent} budgetCurrency={budgetCurrency} date={monthDate} /> : <MoneyAmount amountSatang={mutualSpent} date={monthDate} />}</div>
      <p>из {mutualBudget ? <BudgetMoneyAmount amountMinor={mutualBudget.totalLimitSatang} budgetCurrency={budgetCurrency} date={monthDate} /> : 'не заданного лимита'}</p>
      <div className="hero-progress" aria-label={`Использовано ${progress}% бюджета`}><span style={{ width: `${Math.min(100, progress)}%` }} /></div>
      <div className="hero-footer"><span>{isBudgetExceeded ? 'Сверх общего лимита' : 'Осталось'}</span><strong>{mutualBudget ? <BudgetMoneyAmount amountMinor={isBudgetExceeded ? budgetOverage : remaining} budgetCurrency={budgetCurrency} date={monthDate} /> : '—'}</strong></div>
      {missingBudgetRates ? <p className="hero-warning">Без курса: {missingBudgetRates} расходов. Прогресс неполный.</p> : null}
    </section>

    {exceededCategories.length ? <section className="over-budget-card">
      <div className="over-budget-glow" />
      <header className="over-budget-header"><span className="over-budget-icon"><TrendingUp size={20} /></span><div><p className="eyebrow">Требует внимания</p><h2>За пределами плана</h2></div><strong>+<BudgetMoneyAmount amountMinor={categoryOverage} budgetCurrency={budgetCurrency} date={monthDate} /></strong></header>
      <div className="over-budget-list">{exceededCategories.map((row) => { const over = row.spent - row.limitSatang; const overPercent = Math.round(over / row.limitSatang * 100); return <div className="over-budget-row" key={row.categoryId}><div><strong>{categoryMap.get(row.categoryId) ?? 'Категория'}</strong><small><BudgetMoneyAmount amountMinor={row.spent} budgetCurrency={budgetCurrency} date={monthDate} /> из <BudgetMoneyAmount amountMinor={row.limitSatang} budgetCurrency={budgetCurrency} date={monthDate} /></small></div><span>+{overPercent}%</span><b>+<BudgetMoneyAmount amountMinor={over} budgetCurrency={budgetCurrency} date={monthDate} /></b></div> })}</div>
      <Link to="/budgets">Открыть бюджет <ArrowRight size={16} /></Link>
    </section> : null}

    <section className="total-strip"><span><WalletCards size={19} /> Всего потрачено в этом месяце</span><strong><MoneyAmount amountSatang={totalSpent} date={monthDate} /></strong></section>

    <div className="dashboard-columns">
      <section className="modern-card category-overview"><div className="section-title"><div><p className="eyebrow">Общие категории</p><h2>Куда уходят деньги</h2></div><Link to="/budgets">Бюджеты</Link></div>{categoryRows.length ? <div className="category-progress-list">{categoryRows.map((row) => { const exceeded = row.limitSatang > 0 && row.spent > row.limitSatang; const percent = row.limitSatang ? Math.min(100, Math.round(row.spent / row.limitSatang * 100)) : 0; return <div className={`category-progress-row${exceeded ? ' exceeded' : ''}`} key={row.categoryId}><div><span>{categoryMap.get(row.categoryId) ?? 'Категория'}</span><strong><BudgetMoneyAmount amountMinor={row.spent} budgetCurrency={budgetCurrency} date={monthDate} /> <small>/ <BudgetMoneyAmount amountMinor={row.limitSatang} budgetCurrency={budgetCurrency} date={monthDate} /></small></strong></div><div className="soft-progress"><span style={{ width: `${percent}%` }} /></div></div> })}</div> : <p className="empty-text">Добавьте лимиты категорий в общем бюджете.</p>}</section>

      <section className="modern-card"><div className="section-title"><div><p className="eyebrow">Последние общие</p><h2>Недавние траты</h2></div><Link to="/expenses">Все <ArrowRight size={16} /></Link></div>{mutualExpenses.length ? <ul className="expense-list modern-list">{mutualExpenses.slice(0, 5).map((expense) => <li key={expense.id}><span className="expense-avatar">{expense.merchant.slice(0, 1).toLocaleUpperCase('ru-RU')}</span><span><strong>{expense.merchant}</strong><small>{categoryMap.get(expense.categoryId) ?? 'Категория'}</small></span><strong><MoneyAmount amountSatang={expense.amountSatang} date={expense.expenseDate} rate={expense} /></strong></li>)}</ul> : <p className="empty-text">Общих расходов пока нет.</p>}</section>
    </div>

    <section className="personal-section"><div><p className="eyebrow">Личное</p><h2>Второй план</h2></div><div className="personal-grid">{personalOwners.map((owner) => { const budget = budgets.data.find((item) => item.month === month && item.owner === owner); const spent = monthExpenses.filter((expense) => expense.owner === owner).reduce((sum, expense) => sum + expense.amountSatang, 0); return <details className="personal-card" key={owner}><summary><span><strong>{ownerLabels[owner]}</strong><small>Личные расходы</small></span><span><b><MoneyAmount amountSatang={spent} date={monthDate} /></b><ChevronDown size={17} /></span></summary><div><span>Лимит</span><strong>{budget ? <BudgetMoneyAmount amountMinor={budget.totalLimitSatang} budgetCurrency={budget.currency} date={monthDate} /> : 'Не задан'}</strong></div></details> })}</div></section>

    <Link className="debt-strip" to="/settlements"><span><small>Взаиморасчёты</small><strong>{debtSentence(debt, (amount) => format(amount, liveRate.data))}</strong></span><ArrowRight size={20} /></Link>
  </div>
}

function DashboardSkeleton() { return <div className="page dashboard-page stack" role="status" aria-label="Загружаем сводку"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-hero" /><div className="skeleton skeleton-card" /></div> }

export function PageState({ text, error = false }: { text: string; error?: boolean }) { return <div className={`page-state ${error ? 'error-text' : ''}`} role={error ? 'alert' : 'status'}>{text}</div> }
