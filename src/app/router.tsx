import { Navigate, Route, Routes } from 'react-router-dom'

import { BudgetsPage } from '../features/budgets/BudgetsPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ExpensesPage } from '../features/expenses/ExpensesPage'
import { AddExpensePage } from '../features/capture/AddExpensePage'
import { SettlementsPage } from '../features/settlements/SettlementsPage'
import { MorePage } from '../features/more/MorePage'
import { BottomNav } from './BottomNav'

export function AppRouter() {
  return <div className="app-shell"><main className="content"><Routes><Route path="/" element={<DashboardPage />} /><Route path="/expenses" element={<ExpensesPage />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/settlements" element={<SettlementsPage />} /><Route path="/settings" element={<CategoriesPage />} /><Route path="/more" element={<MorePage />} /><Route path="/add" element={<AddExpensePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main><BottomNav /></div>
}
