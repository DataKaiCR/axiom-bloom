import { describe, expect, it } from 'vitest'
import type { Palette, Season } from '../engine/types'
import { getSeasonalTipShape, resolveSeasonPalette } from './season'

const palette: Palette = {
  root: '#73523a',
  crown: '#75efae',
  accent: '#f6cf78',
}

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter']

describe('seasonal rendering', () => {
  it('keeps summer as the neutral treatment', () => {
    expect(resolveSeasonPalette(palette, 'summer')).toEqual(palette)
  })

  it('creates deterministic, distinct palettes for every season', () => {
    const first = seasons.map((season) => resolveSeasonPalette(palette, season))
    const second = seasons.map((season) => resolveSeasonPalette(palette, season))

    expect(first).toEqual(second)
    expect(new Set(first.map((value) => JSON.stringify(value))).size).toBe(4)
    expect(first.flatMap((value) => Object.values(value))).toSatisfy(
      (colors: string[]) => colors.every((color) => /^#[0-9a-f]{6}$/.test(color)),
    )
  })

  it('assigns a distinct terminal mark to each season', () => {
    expect(seasons.map(getSeasonalTipShape)).toEqual([
      'blossom',
      'leaf',
      'falling-leaf',
      'frost',
    ])
  })
})
