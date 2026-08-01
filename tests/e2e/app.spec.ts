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
  await expect(page.getByRole('textbox', { name: 'Rule 1 production' })).toHaveValue(
    'X+YF+',
  )

  expect(pageErrors).toEqual([])
})

test('edits, validates, and resets a custom grammar', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('.stage-metrics strong').first()).not.toHaveText('—')

  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByRole('textbox', { name: 'Rule 3 symbol' }).fill('A')
  await page.getByRole('textbox', { name: 'Rule 3 production' }).fill('F')
  await expect(page.getByText('Custom grammar is live.')).toBeVisible()
  await page.getByRole('button', { name: 'Remove rule A' }).click()
  await expect(page.getByRole('textbox', { name: 'Rule 3 symbol' })).toHaveCount(0)
  await expect(page.getByText('Preset grammar is live.')).toBeVisible()

  await page.getByRole('textbox', { name: 'Axiom' }).fill('F')
  await page.getByRole('textbox', { name: 'Rule 2 production' }).fill('F+F')

  await expect(page.getByText('Custom grammar is live.')).toBeVisible()
  await expect(page.locator('.stage-metrics strong').nth(0)).toHaveText('32')
  await expect(page.locator('.stage-metrics strong').nth(1)).toHaveText('63')

  await page.getByRole('textbox', { name: 'Rule 2 production' }).fill('F[')

  await expect(page.getByText('Rule F has an unmatched opening bracket.')).toBeVisible()
  await expect(page.locator('.engine-status')).toHaveText('Review grammar')
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeDisabled()

  await page.getByRole('button', { name: 'Reset preset' }).click()

  await expect(page.getByRole('textbox', { name: 'Axiom' })).toHaveValue('X')
  await expect(page.getByRole('textbox', { name: 'Rule 2 production' })).toHaveValue('FF')
  await expect(page.getByText('Preset grammar is live.')).toBeVisible()
  expect(pageErrors).toEqual([])
})
