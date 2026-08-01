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

test('copies and restores a complete artwork URL', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('.stage-metrics strong').first()).not.toHaveText('—')

  await page.getByRole('slider', { name: /Generations/ }).fill('4')
  await page.getByRole('slider', { name: /Turn angle/ }).fill('33.5')
  await page.getByRole('slider', { name: /Wildness/ }).fill('4.5')
  await page.getByRole('textbox', { name: 'Seed' }).fill('shared-moss')
  await page.getByLabel('Root', { exact: true }).fill('#112233')
  await page.getByLabel('Crown', { exact: true }).fill('#44aa66')
  await page.getByLabel('Bloom', { exact: true }).fill('#ffe080')
  await page.getByRole('slider', { name: /Weight/ }).fill('4.2')
  await page.getByRole('slider', { name: /Taper/ }).fill('0.82')
  await page.getByRole('slider', { name: /Radiance/ }).fill('11')
  await page.getByRole('checkbox', { name: /Terminal blooms/ }).uncheck()
  await page.getByRole('textbox', { name: 'Axiom' }).fill('F')
  await page.getByRole('textbox', { name: 'Rule 2 production' }).fill('F+F')

  await expect(page.locator('.stage-metrics strong').nth(0)).toHaveText('16')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('125%')
  await page.getByRole('button', { name: 'Copy share link' }).click()
  await expect(page.getByText('Share link copied.')).toBeVisible()

  const sharedUrl = page.url()
  const payload = new URL(sharedUrl).searchParams.get('art')
  expect(payload?.length).toBeGreaterThan(100)
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(sharedUrl)

  await page.evaluate(() => {
    localStorage.setItem(
      'axiom-bloom:viewport:v1',
      JSON.stringify({ v: 1, z: 1, x: 0, y: 0 }),
    )
  })
  await page.goto(sharedUrl)

  await expect(page.getByText('Shared artwork restored.')).toBeVisible()
  await expect(page.getByRole('slider', { name: /Generations/ })).toHaveValue('4')
  await expect(page.getByRole('slider', { name: /Turn angle/ })).toHaveValue('33.5')
  await expect(page.getByRole('slider', { name: /Wildness/ })).toHaveValue('4.5')
  await expect(page.getByRole('textbox', { name: 'Seed' })).toHaveValue('shared-moss')
  await expect(page.getByLabel('Root', { exact: true })).toHaveValue('#112233')
  await expect(page.getByLabel('Crown', { exact: true })).toHaveValue('#44aa66')
  await expect(page.getByLabel('Bloom', { exact: true })).toHaveValue('#ffe080')
  await expect(page.getByRole('slider', { name: /Weight/ })).toHaveValue('4.2')
  await expect(page.getByRole('slider', { name: /Taper/ })).toHaveValue('0.82')
  await expect(page.getByRole('slider', { name: /Radiance/ })).toHaveValue('11')
  await expect(page.getByRole('checkbox', { name: /Terminal blooms/ })).not.toBeChecked()
  await expect(page.getByLabel('Zoom level')).toHaveText('125%')
  await expect(page.getByRole('textbox', { name: 'Axiom' })).toHaveValue('F')
  await expect(page.getByRole('textbox', { name: 'Rule 2 production' })).toHaveValue('F+F')
  await expect(page.locator('.stage-metrics strong').nth(0)).toHaveText('16')
  await expect(page.locator('.stage-metrics strong').nth(1)).toHaveText('31')

  const restoredPayload = new URL(page.url()).searchParams.get('art')
  await page.getByRole('textbox', { name: 'Seed' }).fill('shared-fern')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('art'))
    .not.toBe(restoredPayload)

  const synchronizedUrl = page.url()
  await page.goto(synchronizedUrl)
  await expect(page.getByRole('textbox', { name: 'Seed' })).toHaveValue('shared-fern')
  expect(pageErrors).toEqual([])
})

test('pans, zooms, recenters, and persists the viewport', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('.stage-metrics strong').first()).not.toHaveText('—')

  const surface = page.getByRole('button', { name: 'Interactive artwork viewport' })
  await expect(page.getByLabel('Zoom level')).toHaveText('100%')
  await expect(page.getByRole('button', { name: 'Recenter artwork' })).toBeDisabled()

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('125%')

  const bounds = await surface.boundingBox()
  expect(bounds).not.toBeNull()
  if (!bounds) return

  const startX = bounds.x + bounds.width / 2
  const startY = bounds.y + bounds.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 70, startY + 45, { steps: 6 })
  await page.mouse.up()

  await expect
    .poll(() => page.evaluate(readStoredViewport))
    .toMatchObject({ zoom: 1.25 })
  await expect
    .poll(async () => Math.abs((await page.evaluate(readStoredViewport))?.offsetX ?? 0))
    .toBeGreaterThan(0.02)
  await expect
    .poll(async () => Math.abs((await page.evaluate(readStoredViewport))?.offsetY ?? 0))
    .toBeGreaterThan(0.02)

  await page.reload()
  await expect(page.getByLabel('Zoom level')).toHaveText('125%')

  await page.getByRole('button', { name: 'Recenter artwork' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('100%')
  await expect(page.getByRole('button', { name: 'Recenter artwork' })).toBeDisabled()

  await surface.hover({ position: { x: bounds.width / 2, y: bounds.height / 2 } })
  await page.mouse.wheel(0, -180)
  await expect(page.getByLabel('Zoom level')).not.toHaveText('100%')
  await surface.press('0')
  await expect(page.getByLabel('Zoom level')).toHaveText('100%')
  expect(pageErrors).toEqual([])
})

test('falls back safely from a malformed artwork URL', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/?art=not-valid')

  await expect(page.getByText('This share link could not be restored. Showing the default artwork.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Verdant Bloom', level: 1 })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Axiom' })).toHaveValue('X')
  await expect(page.locator('.stage-metrics strong').first()).not.toHaveText('—')
  expect(pageErrors).toEqual([])
})

function readStoredViewport(): {
  zoom: number
  offsetX: number
  offsetY: number
} | null {
  const stored = window.localStorage.getItem('axiom-bloom:viewport:v1')
  if (!stored) return null

  try {
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    const value = parsed as Record<string, unknown>
    return typeof value.z === 'number' &&
      typeof value.x === 'number' &&
      typeof value.y === 'number'
      ? { zoom: value.z, offsetX: value.x, offsetY: value.y }
      : null
  } catch {
    return null
  }
}
