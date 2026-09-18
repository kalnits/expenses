import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { bangkokToday, calculateDebt, debtSentence } from '../../app/ledger'
import { queryKeys, useHousehold } from '../../app/providers'
import type { Person } from '../../domain/expense'
import { parseThb } from '../../domain/money'
import { PageState } from '../dashboard/DashboardPage'
import { createExpenseRepository } from '../expenses/expenseRepository'
import { createSettlementRepository } from './settlementRepository'
import { MoneyAmount, useDisplayCurrency, useExchangeRate } from '../../lib/displayCurrency'

const personName: Record<Person, string> = { ilya: 'Илья', masha: 'Маша' }

export function SettlementsPage() {
  const { householdId, userId } = useHousehold()
  const queryClient = useQueryClient()
  const repository = createSettlementRepository()
  const expenses = useQuery({ queryKey: queryKeys.expenses(householdId), queryFn: () => createExpenseRepository().list() })
  const settlements = useQuery({ queryKey: queryKeys.settlements(householdId), queryFn: () => repository.list() })
  const [from, setFrom] = useState<Person>('masha')
  const [to, setTo] = useState<Person>('ilya')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { format } = useDisplayCurrency()
  const liveRate = useExchangeRate(bangkokToday())
  const save = useMutation({ mutationFn: (amountSatang: number) => repository.create({ from, to, amountSatang, settlementDate: bangkokToday(), createdBy: userId }), onSuccess: async () => { setAmount(''); await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.settlements(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.debt(householdId) }), queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(householdId) })]) } })

  if (expenses.isPending || settlements.isPending) return <PageState text="Считаем взаиморасчёты…" />
  if (expenses.isError || settlements.isError) return <PageState error text="Не удалось загрузить взаиморасчёты." />
  const balance = calculateDebt(expenses.data, settlements.data)

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (from === to) throw new Error('Отправитель и получатель должны отличаться.')
      const amountSatang = parseThb(amount.replace(',', '.').trim())
      if (amountSatang > Math.abs(balance) && !window.confirm('Сумма больше текущего долга. Всё равно сохранить перевод?')) return
      save.mutate(amountSatang)
    } catch (caught) { setError(caught instanceof Error && caught.message.startsWith('Отправитель') ? caught.message : 'Введите положительную сумму в батах.') }
  }

  return <div className="page stack"><header className="page-header"><div><p className="eyebrow">Баланс пары</p><h1>Взаиморасчёты</h1></div></header><section className="debt-hero"><span>Текущий баланс</span><strong><MoneyAmount amountSatang={Math.abs(balance)} date={bangkokToday()} /></strong><p>{debtSentence(balance, (amountValue) => format(amountValue, liveRate.data))}</p></section><form className="section-card stack" onSubmit={submit}><div><p className="eyebrow">Новый перевод</p><h2>Записать возврат</h2></div><div className="field-grid"><label>Кто отправил<select value={from} onChange={(event) => setFrom(event.target.value as Person)}><option value="ilya">Илья</option><option value="masha">Маша</option></select></label><label>Кому<select value={to} onChange={(event) => setTo(event.target.value as Person)}><option value="ilya">Илья</option><option value="masha">Маша</option></select></label></div><label>Сумма в батах<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></label>{error ? <p className="error-text" role="alert">{error}</p> : null}<button className="button primary" type="submit" disabled={save.isPending}>{save.isPending ? 'Сохраняем…' : 'Сохранить перевод'}</button></form><section className="section-card"><div className="section-title"><div><p className="eyebrow">История</p><h2>Переводы</h2></div></div>{settlements.data.length === 0 ? <p className="empty-text">Переводов пока не было.</p> : <ul className="settlement-list">{settlements.data.map((item) => <li key={item.id}><span><strong>{personName[item.from]} → {personName[item.to]}</strong><small>{new Date(`${item.settlementDate}T00:00:00`).toLocaleDateString('ru-RU')}</small></span><strong><MoneyAmount amountSatang={item.amountSatang} date={item.settlementDate} /></strong></li>)}</ul>}</section>{save.isError ? <p className="error-text" role="alert">{save.error.message}</p> : null}</div>
}
