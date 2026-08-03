import type { Palette, Season } from '../engine/types'

export type SeasonalTipShape = 'blossom' | 'leaf' | 'falling-leaf' | 'frost'

interface SeasonTreatment {
  root: { color: string; amount: number }
  crown: { color: string; amount: number }
  accent: { color: string; amount: number }
  tipShape: SeasonalTipShape
}

const SEASON_TREATMENTS: Record<Season, SeasonTreatment> = {
  spring: {
    root: { color: '#76563f', amount: 0.08 },
    crown: { color: '#79f2a4', amount: 0.32 },
    accent: { color: '#ffb8dc', amount: 0.42 },
    tipShape: 'blossom',
  },
  summer: {
    root: { color: '#000000', amount: 0 },
    crown: { color: '#000000', amount: 0 },
    accent: { color: '#000000', amount: 0 },
    tipShape: 'leaf',
  },
  autumn: {
    root: { color: '#704329', amount: 0.18 },
    crown: { color: '#e57d32', amount: 0.62 },
    accent: { color: '#ffd166', amount: 0.48 },
    tipShape: 'falling-leaf',
  },
  winter: {
    root: { color: '#58666d', amount: 0.3 },
    crown: { color: '#b7d8e8', amount: 0.68 },
    accent: { color: '#f1fbff', amount: 0.56 },
    tipShape: 'frost',
  },
}

export function resolveSeasonPalette(palette: Palette, season: Season): Palette {
  const treatment = SEASON_TREATMENTS[season]
  return {
    root: blendHex(palette.root, treatment.root.color, treatment.root.amount),
    crown: blendHex(palette.crown, treatment.crown.color, treatment.crown.amount),
    accent: blendHex(palette.accent, treatment.accent.color, treatment.accent.amount),
  }
}

export function getSeasonalTipShape(season: Season): SeasonalTipShape {
  return SEASON_TREATMENTS[season].tipShape
}

function blendHex(start: string, end: string, amount: number): string {
  const from = parseHex(start)
  const to = parseHex(end)
  const channels = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  )

  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function parseHex(color: string): [number, number, number] {
  const value = Number.parseInt(color.replace('#', ''), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}
