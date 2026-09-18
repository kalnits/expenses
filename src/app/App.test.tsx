import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('renders the expense tracker heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Расходы в Таиланде' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Добавить расход' }),
    ).toBeInTheDocument()
  })
})
