import { Navigate, Route, Routes } from 'react-router-dom'

import { BudgetsPage } from '../features/budgets/BudgetsPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { AddExpensePage, ExpensesPage } from '../features/expenses/ExpensesPage'
import { SettlementsPage } from '../features/settlements/SettlementsPage'
import { BottomNav } from './BottomNav'
import { CurrencySelector } from '../lib/displayCurrency'

export function AppRouter() {
  return <div className="app-shell"><div className="currency-shell"><CurrencySelector /></div><main className="content"><Routes><Route path="/" element={<DashboardPage />} /><Route path="/expenses" element={<ExpensesPage />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/settlements" element={<SettlementsPage />} /><Route path="/settings" element={<CategoriesPage />} /><Route path="/add" element={<AddExpensePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main><BottomNav /></div>
}
