import { expect, test } from '@playwright/test'

test('shows the expense tracker shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Расходы в Таиланде' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Добавить расход' })).toBeVisible()
})
