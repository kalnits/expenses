import { useState, type FormEvent } from 'react'

interface SignInFormProps {
  sendOtp: (email: string) => Promise<void>
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignInForm({ sendOtp }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Введите корректный адрес электронной почты')
      return
    }

    setError(null)
    setIsComplete(false)
    setIsLoading(true)

    try {
      await sendOtp(normalizedEmail)
      setIsComplete(true)
    } catch {
      setError('Не удалось отправить код. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="sign-in-email">Электронная почта</label>
      <input
        id="sign-in-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        disabled={isLoading}
      />
      {error ? <p role="alert">{error}</p> : null}
      {isComplete ? <p role="status">Проверьте почту</p> : null}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Отправляем…' : 'Получить код'}
      </button>
    </form>
  )
}
