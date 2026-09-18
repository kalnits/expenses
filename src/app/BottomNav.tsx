import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Главная', icon: '⌂' },
  { to: '/expenses', label: 'Расходы', icon: '₿' },
  { to: '/budgets', label: 'Бюджеты', icon: '◫' },
  { to: '/settlements', label: 'Расчёты', icon: '⇄' },
  { to: '/settings', label: 'Настройки', icon: '⚙' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
