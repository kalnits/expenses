import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { queryKeys, useHousehold } from '../../app/providers'
import { PageState } from '../dashboard/DashboardPage'
import { createCategoryRepository } from './categoryRepository'

export function CategoriesPage() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()
  const repository = createCategoryRepository()
  const categories = useQuery({ queryKey: queryKeys.categories(householdId), queryFn: () => repository.list() })
  const [name, setName] = useState('')
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await action(); await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.categories(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.expenses(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.budgets(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })]) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось изменить категории.') }
    finally { setBusy(false) }
  }

  function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setError('Введите название категории.'); return }
    void run(async () => { await repository.create(name); setName('') })
  }

  if (categories.isPending) return <PageState text="Загружаем настройки…" />
  if (categories.isError) return <PageState error text={categories.error.message} />
  const active = categories.data.filter((item) => item.isActive)

  return <div className="page stack"><header className="page-header"><div><p className="eyebrow">Порядок в тратах</p><h1>Настройки</h1><p>Категории доступны во всех расходах и бюджетах.</p></div><a className="button secondary" href="/signout-with-chatgpt?return_to=%2F">Выйти</a></header><section className="section-card stack"><div><p className="eyebrow">Категории</p><h2>Добавить новую</h2></div><form className="inline-form" onSubmit={create}><label className="sr-only" htmlFor="new-category">Название категории</label><input id="new-category" value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Путешествия" /><button className="button primary" type="submit" disabled={busy}>Добавить</button></form></section><section className="section-card"><div className="section-title"><h2>Все категории</h2><span className="badge">{active.length} активных</span></div><ul className="category-list">{categories.data.map((category) => <li key={category.id} className={category.isActive ? '' : 'inactive'}><div><strong>{category.name}</strong><small>{category.isActive ? 'Активна' : 'Отключена'}</small></div><div className="category-actions"><button className="text-button" type="button" disabled={busy} onClick={() => { const next = window.prompt('Новое название категории', category.name); if (next?.trim() && next.trim() !== category.name) void run(() => repository.rename(category.id, next)) }}>Переименовать</button>{category.isActive ? <button className="text-button danger" type="button" disabled={busy || active.length === 1} title={active.length === 1 ? 'Нельзя отключить последнюю активную категорию' : undefined} onClick={() => void run(() => repository.setActive(category.id, false))}>Отключить</button> : <button className="text-button" type="button" disabled={busy} onClick={() => void run(() => repository.setActive(category.id, true))}>Включить</button>}</div>{category.isActive && active.length > 1 ? <div className="merge-row"><select aria-label={`Объединить ${category.name} с категорией`} value={mergeTargets[category.id] ?? ''} onChange={(event) => setMergeTargets({ ...mergeTargets, [category.id]: event.target.value })}><option value="">Перенести в…</option>{active.filter((target) => target.id !== category.id).map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select><button className="button ghost" type="button" disabled={!mergeTargets[category.id] || busy} onClick={() => { const target = active.find((item) => item.id === mergeTargets[category.id]); if (target && window.confirm(`Перенести расходы и лимиты из «${category.name}» в «${target.name}»?`)) void run(() => repository.merge(category.id, target.id)) }}>Объединить</button></div> : null}</li>)}</ul></section>{active.length === 1 ? <p className="notice">Последнюю активную категорию отключить нельзя.</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}</div>
}
