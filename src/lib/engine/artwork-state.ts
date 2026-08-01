import {
  compactViewport,
  createDefaultViewport,
  isViewportState,
  type ViewportState,
} from '../viewport'
import { validateGrammar, type ProductionRuleDraft } from './grammar'
import { PRESETS } from './presets'
import type { Palette } from './types'

export const ARTWORK_QUERY_PARAMETER = 'art'
export const ARTWORK_STATE_VERSION = 2
export const MAX_ARTWORK_PAYLOAD_LENGTH = 8_192
export const MAX_SEED_LENGTH = 128

export const ARTWORK_LIMITS = {
  angle: { min: 0, max: 180 },
  turnJitter: { min: 0, max: 25 },
  trunkWidth: { min: 0.8, max: 12 },
  taper: { min: 0.5, max: 1 },
  glow: { min: 0, max: 18 },
} as const

export interface ArtworkState {
  presetId: string
  axiom: string
  rules: ProductionRuleDraft[]
  generations: number
  angle: number
  turnJitter: number
  seed: string
  palette: Palette
  trunkWidth: number
  taper: number
  glow: number
  showTips: boolean
  viewport: ViewportState
}

export type ArtworkStateFailureReason =
  | 'invalid-state'
  | 'malformed'
  | 'too-large'
  | 'unsupported-version'

export type ArtworkStateCodecResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ArtworkStateFailureReason }

interface ArtworkPayloadBase {
  p: string
  a: string
  r: [string, string][]
  g: number
  d: number
  j: number
  s: string
  c: [string, string, string]
  w: number
  t: number
  l: number
  b: 0 | 1
}

interface ArtworkPayloadV2 extends ArtworkPayloadBase {
  v: 2
  u: [number, number, number]
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export function encodeArtworkState(
  state: ArtworkState,
): ArtworkStateCodecResult<string> {
  const normalized = normalizeArtworkState(state)
  if (!normalized) return { ok: false, reason: 'invalid-state' }

  const payload: ArtworkPayloadV2 = {
    v: ARTWORK_STATE_VERSION,
    p: normalized.presetId,
    a: normalized.axiom,
    r: normalized.rules.map((rule) => [rule.symbol, rule.replacement]),
    g: normalized.generations,
    d: normalized.angle,
    j: normalized.turnJitter,
    s: normalized.seed,
    c: [
      normalized.palette.root,
      normalized.palette.crown,
      normalized.palette.accent,
    ],
    w: normalized.trunkWidth,
    t: normalized.taper,
    l: normalized.glow,
    b: normalized.showTips ? 1 : 0,
    u: [
      normalized.viewport.zoom,
      normalized.viewport.offsetX,
      normalized.viewport.offsetY,
    ],
  }

  const encoded = encodeBase64Url(JSON.stringify(payload))
  if (encoded.length > MAX_ARTWORK_PAYLOAD_LENGTH) {
    return { ok: false, reason: 'too-large' }
  }

  return { ok: true, value: encoded }
}

export function decodeArtworkState(
  encoded: string,
): ArtworkStateCodecResult<ArtworkState> {
  if (encoded.length === 0 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { ok: false, reason: 'malformed' }
  }
  if (encoded.length > MAX_ARTWORK_PAYLOAD_LENGTH) {
    return { ok: false, reason: 'too-large' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeBase64Url(encoded)) as unknown
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (!isRecord(parsed)) return { ok: false, reason: 'malformed' }
  if (
    typeof parsed.v === 'number' &&
    parsed.v !== 1 &&
    parsed.v !== ARTWORK_STATE_VERSION
  ) {
    return { ok: false, reason: 'unsupported-version' }
  }
  if (parsed.v !== 1 && parsed.v !== ARTWORK_STATE_VERSION) {
    return { ok: false, reason: 'malformed' }
  }

  const viewport = parsed.v === 1
    ? createDefaultViewport()
    : parseViewportPayload(parsed.u)
  if (!viewport) return { ok: false, reason: 'invalid-state' }

  const state = parseArtworkPayload(parsed, viewport)
  if (!state) return { ok: false, reason: 'invalid-state' }

  const normalized = normalizeArtworkState(state)
  return normalized
    ? { ok: true, value: normalized }
    : { ok: false, reason: 'invalid-state' }
}

function parseArtworkPayload(
  payload: Record<string, unknown>,
  viewport: ViewportState,
): ArtworkState | null {
  const rules = parseRules(payload.r)
  const palette = parsePalette(payload.c)

  if (
    typeof payload.p !== 'string' ||
    typeof payload.a !== 'string' ||
    !rules ||
    typeof payload.g !== 'number' ||
    typeof payload.d !== 'number' ||
    typeof payload.j !== 'number' ||
    typeof payload.s !== 'string' ||
    !palette ||
    typeof payload.w !== 'number' ||
    typeof payload.t !== 'number' ||
    typeof payload.l !== 'number' ||
    (payload.b !== 0 && payload.b !== 1)
  ) {
    return null
  }

  return {
    presetId: payload.p,
    axiom: payload.a,
    rules,
    generations: payload.g,
    angle: payload.d,
    turnJitter: payload.j,
    seed: payload.s,
    palette,
    trunkWidth: payload.w,
    taper: payload.t,
    glow: payload.l,
    showTips: payload.b === 1,
    viewport,
  }
}

function normalizeArtworkState(state: ArtworkState): ArtworkState | null {
  const preset = PRESETS.find((candidate) => candidate.id === state.presetId)
  const grammar = validateGrammar(state.axiom, state.rules)

  if (
    !preset ||
    !grammar.valid ||
    !Number.isInteger(state.generations) ||
    state.generations < 0 ||
    state.generations > preset.maxGenerations ||
    !inRange(state.angle, ARTWORK_LIMITS.angle) ||
    !inRange(state.turnJitter, ARTWORK_LIMITS.turnJitter) ||
    !inRange(state.trunkWidth, ARTWORK_LIMITS.trunkWidth) ||
    !inRange(state.taper, ARTWORK_LIMITS.taper) ||
    !inRange(state.glow, ARTWORK_LIMITS.glow) ||
    [...state.seed].length > MAX_SEED_LENGTH ||
    CONTROL_CHARACTER.test(state.seed) ||
    !isColor(state.palette.root) ||
    !isColor(state.palette.crown) ||
    !isColor(state.palette.accent) ||
    !isViewportState(state.viewport)
  ) {
    return null
  }

  return {
    ...state,
    axiom: grammar.axiom,
    rules: state.rules.map((rule) => ({
      symbol: rule.symbol.trim(),
      replacement: rule.replacement,
    })),
    palette: {
      root: state.palette.root.toLowerCase(),
      crown: state.palette.crown.toLowerCase(),
      accent: state.palette.accent.toLowerCase(),
    },
    viewport: compactViewport(state.viewport),
  }
}

function parseViewportPayload(value: unknown): ViewportState | null {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    typeof value[2] !== 'number'
  ) {
    return null
  }

  const viewport = { zoom: value[0], offsetX: value[1], offsetY: value[2] }
  return isViewportState(viewport) ? viewport : null
}

function parseRules(value: unknown): ProductionRuleDraft[] | null {
  if (!Array.isArray(value)) return null

  const rules: ProductionRuleDraft[] = []
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== 'string' ||
      typeof entry[1] !== 'string'
    ) {
      return null
    }
    rules.push({ symbol: entry[0], replacement: entry[1] })
  }

  return rules
}

function parsePalette(value: unknown): Palette | null {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((color) => typeof color === 'string')
  ) {
    return null
  }

  return {
    root: String(value[0]),
    crown: String(value[1]),
    accent: String(value[2]),
  }
}

function inRange(
  value: number,
  limits: { readonly min: number; readonly max: number },
): boolean {
  return Number.isFinite(value) && value >= limits.min && value <= limits.max
}

function isColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}
