import { expect, test } from '@playwright/test'

test('grows artwork and switches between presets', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Verdant Bloom', level: 1 })).toBeVisible()
  await expect(page.locator('.stage-metrics strong').first()).not.toHaveText('—')

  const canvasDataLength = await page.locator('canvas').evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL('image/png').length,
  )
  expect(canvasDataLength).toBeGreaterThan(10_000)

  await page.getByRole('button', { name: /Paper Dragon/ }).click()
  await expect(page.getByRole('heading', { name: 'Paper Dragon', level: 1 })).toBeVisible()
  await expect(page.locator('.stage-metrics strong').first()).toHaveText('4,096')
  await expect(page.locator('.grammar-row code').filter({ hasText: 'X+YF+' })).toBeVisible()

  expect(pageErrors).toEqual([])
})
