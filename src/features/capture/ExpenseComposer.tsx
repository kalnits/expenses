import { Camera, LoaderCircle, Mic, PencilLine, Send, Square } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { CaptureError, downsizeReceipt, parseReceipt, parseText, parseVoice, type CaptureResult } from './captureClient'

export type CaptureMethod = 'text' | 'voice' | 'receipt' | 'manual'
export type CaptureMessage = { kind: Exclude<CaptureMethod, 'manual'>; text: string; previewUrl?: string }

interface Props {
  disabled?: boolean
  onCaptured: (result: CaptureResult, message: CaptureMessage, method: CaptureMethod) => void
  onManual: (notes?: string) => void
}

export function ExpenseComposer({ disabled, onCaptured, onManual }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const fileInput = useRef<HTMLInputElement | null>(null)

  async function submitText(event: FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setError(null); setBusy(true)
    try { const result = await parseText(value); onCaptured(result, { kind: 'text', text: value }, 'text'); setText('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось распознать расход.') }
    finally { setBusy(false) }
  }

  async function selectReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setError(null); setBusy(true)
    try { const image = await downsizeReceipt(file); const result = await parseReceipt(image); onCaptured(result, { kind: 'receipt', text: 'Чек', previewUrl }, 'receipt') }
    catch (caught) { URL.revokeObjectURL(previewUrl); setError(caught instanceof Error ? caught.message : 'Не удалось распознать чек.') }
    finally { setBusy(false); event.target.value = '' }
  }

  function release() { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; recorder.current = null; chunks.current = [] }
  async function toggleRecording() {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); return }
    setError(null)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream.current, { mimeType: type })
      recorder.current = mediaRecorder; chunks.current = []
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      mediaRecorder.onstop = async () => {
        const audio = new Blob(chunks.current, { type }); release(); setRecording(false); setBusy(true)
        try { const result = await parseVoice(audio); onCaptured(result, { kind: 'voice', text: result.transcript || 'Голосовое сообщение' }, 'voice') }
        catch (caught) { const transcript = caught instanceof CaptureError ? caught.transcript : undefined; setError(caught instanceof Error ? caught.message : 'Не удалось обработать запись.'); if (transcript) onManual(transcript) }
        finally { setBusy(false) }
      }
      mediaRecorder.start(); setRecording(true)
    } catch { release(); setError('Не удалось получить доступ к микрофону.') }
  }

  return <div className="composer-wrap">
    {busy ? <div className="assistant-bubble processing-bubble"><LoaderCircle className="spin" size={18} /><span>Разбираю расход…</span><i /><i /><i /></div> : null}
    {error ? <div className="composer-error" role="alert"><span>{error}</span><button type="button" onClick={() => onManual(text)}>Заполнить вручную</button></div> : null}
    <form className={`chat-composer${recording ? ' recording' : ''}`} onSubmit={submitText}>
      <input ref={fileInput} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void selectReceipt(event)} />
      <button className="composer-icon" type="button" aria-label="Добавить фото чека" disabled={busy || disabled || recording} onClick={() => fileInput.current?.click()}><Camera size={21} /></button>
      <label><span className="sr-only">Опишите расход</span><input value={text} onChange={(event) => setText(event.target.value)} disabled={busy || disabled || recording} placeholder={recording ? 'Идёт запись…' : 'Напишите расход…'} maxLength={4000} /></label>
      <button className={`composer-icon mic-button${recording ? ' active' : ''}`} type="button" aria-label={recording ? 'Остановить запись' : 'Записать голосом'} disabled={busy || disabled} onClick={() => void toggleRecording()}>{recording ? <Square size={17} fill="currentColor" /> : <Mic size={21} />}</button>
      <button className="composer-send" type="submit" aria-label="Отправить" disabled={busy || disabled || recording || !text.trim()}><Send size={19} /></button>
    </form>
    <button className="manual-link" type="button" disabled={busy || disabled} onClick={() => onManual(text)}><PencilLine size={15} /> Заполнить вручную</button>
  </div>
}
