import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_LIMITS,
  createDefaultViewport,
  isDefaultViewport,
  panViewport,
  parseViewport,
  serializeViewport,
  zoomViewportAt,
} from './viewport'

describe('viewport state', () => {
  it('pans in normalized canvas coordinates and clamps recoverably', () => {
    expect(panViewport(createDefaultViewport(), 0.15, -0.25)).toEqual({
      zoom: 1,
      offsetX: 0.15,
      offsetY: -0.25,
    })

    expect(panViewport(createDefaultViewport(), 20, -20)).toEqual({
      zoom: 1,
      offsetX: VIEWPORT_LIMITS.offset.max,
      offsetY: VIEWPORT_LIMITS.offset.min,
    })
  })

  it('keeps the artwork point under the zoom anchor stable', () => {
    expect(
      zoomViewportAt(createDefaultViewport(), 2, { x: 0.75, y: 0.25 }),
    ).toEqual({
      zoom: 2,
      offsetX: -0.25,
      offsetY: 0.25,
    })
  })

  it('combines pinch zoom with midpoint translation', () => {
    const viewport = zoomViewportAt(
      createDefaultViewport(),
      2,
      { x: 0.5, y: 0.5 },
      { x: 0.6, y: 0.4 },
    )

    expect(viewport.zoom).toBe(2)
    expect(viewport.offsetX).toBeCloseTo(0.1)
    expect(viewport.offsetY).toBeCloseTo(-0.1)
  })

  it('serializes finite compact values and rejects malformed storage', () => {
    const viewport = { zoom: 1.23456789, offsetX: -0.1234567, offsetY: 0.25 }
    expect(parseViewport(serializeViewport(viewport))).toEqual({
      zoom: 1.23457,
      offsetX: -0.12346,
      offsetY: 0.25,
    })
    expect(parseViewport('{bad json')).toBeNull()
    expect(parseViewport(JSON.stringify({ v: 1, z: 99, x: 0, y: 0 }))).toBeNull()
    expect(parseViewport(JSON.stringify({ v: 2, z: 1, x: 0, y: 0 }))).toBeNull()
  })

  it('recognizes the fitted default viewport', () => {
    expect(isDefaultViewport(createDefaultViewport())).toBe(true)
    expect(isDefaultViewport({ ...DEFAULT_VIEWPORT, zoom: 1.1 })).toBe(false)
  })
})
