import { NavLink } from 'react-router-dom'
import { ChartNoAxesCombined, Home, List, Plus, Shapes } from 'lucide-react'

const items = [
  { to: '/', label: 'Главная', Icon: Home },
  { to: '/expenses', label: 'Расходы', Icon: List },
  { to: '/add', label: 'Добавить', Icon: Plus, primary: true },
  { to: '/budgets', label: 'Бюджеты', Icon: ChartNoAxesCombined },
  { to: '/more', label: 'Ещё', Icon: Shapes },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}${item.primary ? ' nav-add' : ''}`}>
          <span className="nav-icon" aria-hidden="true"><item.Icon size={21} strokeWidth={2.2} /></span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
