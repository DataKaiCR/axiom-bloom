import { describe, expect, it } from 'vitest'
import { createDefaultViewport } from '../viewport'
import {
  ARTWORK_STATE_VERSION,
  MAX_ARTWORK_PAYLOAD_LENGTH,
  decodeArtworkState,
  encodeArtworkState,
  type ArtworkState,
} from './artwork-state'

const artwork: ArtworkState = {
  presetId: 'verdant-bloom',
  axiom: 'F',
  rules: [
    { symbol: 'X', replacement: 'F+[[X]-X]-F[-FX]+X' },
    { symbol: 'F', replacement: 'F+F' },
  ],
  generations: 4,
  angle: 33.5,
  turnJitter: 4.5,
  wind: 0.35,
  gravity: 0.4,
  seed: 'moss-🌿',
  palette: { root: '#112233', crown: '#44AA66', accent: '#ffe080' },
  trunkWidth: 4.2,
  taper: 0.82,
  glow: 11,
  showTips: false,
  viewport: { zoom: 1.75, offsetX: -0.2, offsetY: 0.15 },
}

describe('artwork state URLs', () => {
  it('round-trips a deterministic versioned payload', () => {
    const first = encodeArtworkState(artwork)
    const second = encodeArtworkState(artwork)

    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    expect(decodeArtworkState(first.value)).toEqual({
      ok: true,
      value: {
        ...artwork,
        palette: { root: '#112233', crown: '#44aa66', accent: '#ffe080' },
      },
    })
  })

  it('restores version-one links with a fitted viewport', () => {
    const legacyPayload = toPayload(artwork)
    legacyPayload.v = 1
    delete legacyPayload.u
    delete legacyPayload.e

    expect(decodeArtworkState(encodeRaw(legacyPayload))).toEqual({
      ok: true,
      value: {
        ...artwork,
        palette: { root: '#112233', crown: '#44aa66', accent: '#ffe080' },
        wind: 0,
        gravity: 0,
        viewport: createDefaultViewport(),
      },
    })
  })

  it('restores version-two links with neutral environmental effects', () => {
    const legacyPayload = toPayload(artwork)
    legacyPayload.v = 2
    delete legacyPayload.e

    expect(decodeArtworkState(encodeRaw(legacyPayload))).toEqual({
      ok: true,
      value: {
        ...artwork,
        palette: { root: '#112233', crown: '#44aa66', accent: '#ffe080' },
        wind: 0,
        gravity: 0,
      },
    })
  })

  it('rejects unsupported versions and malformed payloads', () => {
    expect(decodeArtworkState(encodeRaw({ v: ARTWORK_STATE_VERSION + 1 }))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    })
    expect(decodeArtworkState('not_json')).toEqual({
      ok: false,
      reason: 'malformed',
    })
    expect(decodeArtworkState('***')).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })

  it('rejects unknown presets, unsafe settings, and invalid grammars', () => {
    const encodedArtwork = encodeArtworkState(artwork)
    expect(encodedArtwork.ok).toBe(true)

    expect(
      decodeArtworkState(
        encodeRaw({ ...toPayload(artwork), p: 'missing-preset' }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-state' })
    expect(
      decodeArtworkState(
        encodeRaw({ ...toPayload(artwork), g: 99 }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-state' })
    expect(
      decodeArtworkState(
        encodeRaw({ ...toPayload(artwork), u: [99, 0, 0] }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-state' })
    expect(
      decodeArtworkState(
        encodeRaw({ ...toPayload(artwork), e: [2, 0] }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-state' })
    expect(
      decodeArtworkState(
        encodeRaw({ ...toPayload(artwork), e: ['wind', 0] }),
      ),
    ).toEqual({ ok: false, reason: 'invalid-state' })
    expect(
      encodeArtworkState({ ...artwork, rules: [{ symbol: 'F', replacement: 'F[' }] }),
    ).toEqual({ ok: false, reason: 'invalid-state' })
  })

  it('enforces the encoded payload size limit', () => {
    expect(decodeArtworkState('a'.repeat(MAX_ARTWORK_PAYLOAD_LENGTH + 1))).toEqual({
      ok: false,
      reason: 'too-large',
    })

    const longReplacement = 'F'.repeat(4_096)
    expect(
      encodeArtworkState({
        ...artwork,
        rules: [
          { symbol: 'F', replacement: longReplacement },
          { symbol: 'G', replacement: longReplacement },
        ],
      }),
    ).toEqual({ ok: false, reason: 'too-large' })
  })
})

function toPayload(state: ArtworkState): Record<string, unknown> {
  return {
    v: ARTWORK_STATE_VERSION,
    p: state.presetId,
    a: state.axiom,
    r: state.rules.map((rule) => [rule.symbol, rule.replacement]),
    g: state.generations,
    d: state.angle,
    j: state.turnJitter,
    s: state.seed,
    e: [state.wind, state.gravity],
    c: [state.palette.root, state.palette.crown, state.palette.accent],
    w: state.trunkWidth,
    t: state.taper,
    l: state.glow,
    b: state.showTips ? 1 : 0,
    u: [state.viewport.zoom, state.viewport.offsetX, state.viewport.offsetY],
  }
}

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
