import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SignInForm } from './SignInForm'

afterEach(cleanup)

describe('SignInForm', () => {
  it('sends a normalized email address', async () => {
    const user = userEvent.setup()
    const sendOtp = vi.fn().mockResolvedValue(undefined)

    render(<SignInForm sendOtp={sendOtp} />)

    await user.type(screen.getByLabelText('Электронная почта'), ' ilya@example.com ')
    await user.click(screen.getByRole('button', { name: 'Получить код' }))

    expect(sendOtp).toHaveBeenCalledWith('ilya@example.com')
    expect(await screen.findByText('Проверьте почту')).toBeVisible()
  })

  it('shows an accessible error for an invalid email address', async () => {
    const user = userEvent.setup()
    const sendOtp = vi.fn()

    render(<SignInForm sendOtp={sendOtp} />)

    await user.type(screen.getByLabelText('Электронная почта'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Получить код' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Введите корректный адрес электронной почты')
    expect(sendOtp).not.toHaveBeenCalled()
  })
})
