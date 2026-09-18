import { useState, type ChangeEvent } from 'react'
import { downsizeReceipt, parseReceipt, type CaptureResult } from './captureClient'

export function ReceiptCapture({ onResult, onManual }: { onResult: (result: CaptureResult) => void; onManual: () => void }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const [fileName, setFileName] = useState('')
  async function selected(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setFileName(file.name); setError(null); setLoading(true); let image: Blob | null = null; try { image = await downsizeReceipt(file); onResult(await parseReceipt(image)) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось распознать чек.') } finally { image = null; setLoading(false) } }
  return <section className="section-card stack"><div><h2>Сфотографируйте чек</h2><p>Фото уменьшается на устройстве и не сохраняется после распознавания.</p></div><label className="button secondary receipt-picker">{loading ? 'Обрабатываем…' : 'Выбрать или снять чек'}<input className="sr-only" type="file" accept="image/*" capture="environment" disabled={loading} onChange={(event) => void selected(event)} /></label>{fileName ? <p className="capture-meta">{fileName}</p> : null}{error ? <p className="error-text" role="alert">{error}</p> : null}<button className="button secondary" type="button" onClick={onManual}>Заполнить вручную</button></section>
}
