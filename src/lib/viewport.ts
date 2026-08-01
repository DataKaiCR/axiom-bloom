export const VIEWPORT_STORAGE_KEY = 'axiom-bloom:viewport:v1'
export const VIEWPORT_STORAGE_VERSION = 1

export const VIEWPORT_LIMITS = {
  zoom: { min: 0.25, max: 12 },
  offset: { min: -4, max: 4 },
} as const

export interface ViewportState {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface ViewportPoint {
  /** Horizontal position normalized to the canvas width. */
  x: number
  /** Vertical position normalized to the canvas height. */
  y: number
}

export const DEFAULT_VIEWPORT: Readonly<ViewportState> = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

export function createDefaultViewport(): ViewportState {
  return { ...DEFAULT_VIEWPORT }
}

export function panViewport(
  viewport: ViewportState,
  deltaX: number,
  deltaY: number,
): ViewportState {
  const current = constrainViewport(viewport)
  return constrainViewport({
    ...current,
    offsetX: current.offsetX + finiteOr(deltaX, 0),
    offsetY: current.offsetY + finiteOr(deltaY, 0),
  })
}

/**
 * Zooms around a normalized canvas point. A different current anchor also
 * applies the translation produced by a two-pointer pinch gesture.
 */
export function zoomViewportAt(
  viewport: ViewportState,
  requestedZoom: number,
  startAnchor: ViewportPoint,
  currentAnchor: ViewportPoint = startAnchor,
): ViewportState {
  const current = constrainViewport(viewport)
  const zoom = clamp(
    finiteOr(requestedZoom, current.zoom),
    VIEWPORT_LIMITS.zoom.min,
    VIEWPORT_LIMITS.zoom.max,
  )
  const ratio = zoom / current.zoom
  const startX = finiteOr(startAnchor.x, 0.5) - 0.5
  const startY = finiteOr(startAnchor.y, 0.5) - 0.5
  const currentX = finiteOr(currentAnchor.x, 0.5) - 0.5
  const currentY = finiteOr(currentAnchor.y, 0.5) - 0.5

  return constrainViewport({
    zoom,
    offsetX: currentX - (startX - current.offsetX) * ratio,
    offsetY: currentY - (startY - current.offsetY) * ratio,
  })
}

export function constrainViewport(viewport: ViewportState): ViewportState {
  return {
    zoom: clamp(
      finiteOr(viewport.zoom, DEFAULT_VIEWPORT.zoom),
      VIEWPORT_LIMITS.zoom.min,
      VIEWPORT_LIMITS.zoom.max,
    ),
    offsetX: clamp(
      finiteOr(viewport.offsetX, DEFAULT_VIEWPORT.offsetX),
      VIEWPORT_LIMITS.offset.min,
      VIEWPORT_LIMITS.offset.max,
    ),
    offsetY: clamp(
      finiteOr(viewport.offsetY, DEFAULT_VIEWPORT.offsetY),
      VIEWPORT_LIMITS.offset.min,
      VIEWPORT_LIMITS.offset.max,
    ),
  }
}

export function compactViewport(viewport: ViewportState): ViewportState {
  const constrained = constrainViewport(viewport)
  return {
    zoom: round(constrained.zoom),
    offsetX: round(constrained.offsetX),
    offsetY: round(constrained.offsetY),
  }
}

export function isViewportState(value: unknown): value is ViewportState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const candidate = value as Record<string, unknown>
  return (
    isNumberInRange(candidate.zoom, VIEWPORT_LIMITS.zoom) &&
    isNumberInRange(candidate.offsetX, VIEWPORT_LIMITS.offset) &&
    isNumberInRange(candidate.offsetY, VIEWPORT_LIMITS.offset)
  )
}

export function isDefaultViewport(viewport: ViewportState): boolean {
  const compact = compactViewport(viewport)
  return (
    compact.zoom === DEFAULT_VIEWPORT.zoom &&
    compact.offsetX === DEFAULT_VIEWPORT.offsetX &&
    compact.offsetY === DEFAULT_VIEWPORT.offsetY
  )
}

export function serializeViewport(viewport: ViewportState): string {
  const compact = compactViewport(viewport)
  return JSON.stringify({
    v: VIEWPORT_STORAGE_VERSION,
    z: compact.zoom,
    x: compact.offsetX,
    y: compact.offsetY,
  })
}

export function parseViewport(value: string | null): ViewportState | null {
  if (value === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null
  }

  const candidate = parsed as Record<string, unknown>
  const viewport = {
    zoom: candidate.z,
    offsetX: candidate.x,
    offsetY: candidate.y,
  }

  return candidate.v === VIEWPORT_STORAGE_VERSION && isViewportState(viewport)
    ? compactViewport(viewport)
    : null
}

function isNumberInRange(
  value: unknown,
  limits: { readonly min: number; readonly max: number },
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= limits.min &&
    value <= limits.max
  )
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function round(value: number): number {
  const rounded = Math.round(value * 100_000) / 100_000
  return Object.is(rounded, -0) ? 0 : rounded
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
