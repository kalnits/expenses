import { ChevronRight, HandCoins, Settings2, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CurrencySelector } from '../../lib/displayCurrency'

const links = [
  { to: '/settlements', title: 'Взаиморасчёты', copy: 'Кто кому должен', Icon: HandCoins },
  { to: '/settings', title: 'Категории', copy: 'Названия и правила магазинов', Icon: Tags },
]

export function MorePage() {
  return <div className="page narrow stack"><header className="page-header"><div><p className="eyebrow">Настройки</p><h1>Ещё</h1><p>Всё, что не нужно каждый день.</p></div><Settings2 size={28} /></header><section className="modern-card settings-currency"><div><strong>Валюта интерфейса</strong><small>Переключайте суммы во всём приложении</small></div><CurrencySelector /></section><section className="more-list">{links.map(({ to, title, copy, Icon }) => <Link key={to} to={to} className="more-link"><span className="more-icon"><Icon size={21} /></span><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight size={19} /></Link>)}</section></div>
}
