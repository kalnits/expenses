import { debtEffect } from '../../domain/debt'
import { debtSentence, formatThb, ownerLabels, sourceLabels } from '../../app/ledger'
import type { CategoryRecord } from '../categories/categoryRepository'
import type { ExpenseDraft } from './ExpenseDraftForm'

interface Props {
  draft: ExpenseDraft
  categories: CategoryRecord[]
  isSaving?: boolean
  onBack: () => void
  onSave: () => void
}

export function ExpensePreview({ draft, categories, isSaving, onBack, onSave }: Props) {
  const category = categories.find((item) => item.id === draft.categoryId)
  const effect = debtEffect(draft)
  return (
    <section className="preview-card stack" aria-labelledby="preview-title">
      <div><p className="eyebrow">Проверка</p><h2 id="preview-title">{draft.merchant}</h2><p className="preview-amount">{formatThb(draft.amountSatang)}</p></div>
      <dl className="detail-list">
        <div><dt>Категория</dt><dd>{category?.name ?? 'Без категории'}</dd></div>
        <div><dt>Чей расход</dt><dd>{ownerLabels[draft.owner]}</dd></div>
        <div><dt>Оплачено</dt><dd>{sourceLabels[draft.paidFrom]}</dd></div>
        <div><dt>Дата</dt><dd>{new Date(`${draft.expenseDate}T00:00:00`).toLocaleDateString('ru-RU')}</dd></div>
        {draft.notes ? <div><dt>Заметка</dt><dd>{draft.notes}</dd></div> : null}
      </dl>
      <p className="debt-note">После этой траты: {debtSentence(effect).toLocaleLowerCase('ru-RU')}</p>
      <div className="button-row"><button className="button secondary" type="button" onClick={onBack}>Изменить</button><button className="button primary" type="button" disabled={isSaving} onClick={onSave}>{isSaving ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </section>
  )
}
