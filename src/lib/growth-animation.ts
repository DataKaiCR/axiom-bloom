export const GROWTH_SPEED_LIMITS = {
  min: 0.25,
  max: 3,
  default: 1,
} as const

const MIN_GROWTH_DURATION = 2_400
const MAX_GROWTH_DURATION = 6_500

export function getGrowthDuration(segmentCount: number, speed: number): number {
  const safeSegmentCount = Number.isFinite(segmentCount)
    ? Math.max(0, segmentCount)
    : 0
  const baseDuration = Math.min(
    MAX_GROWTH_DURATION,
    Math.max(MIN_GROWTH_DURATION, 1_800 + safeSegmentCount * 0.12),
  )
  return baseDuration / normalizeGrowthSpeed(speed)
}

export function easeGrowthProgress(linearProgress: number): number {
  const progress = normalizeGrowthProgress(linearProgress)
  return 1 - (1 - progress) ** 3
}

export function linearizeGrowthProgress(easedProgress: number): number {
  const progress = normalizeGrowthProgress(easedProgress)
  return 1 - Math.cbrt(1 - progress)
}

export function normalizeGrowthProgress(progress: number): number {
  return normalizeFinite(progress, 0, 1, 0)
}

export function normalizeGrowthSpeed(speed: number): number {
  return normalizeFinite(
    speed,
    GROWTH_SPEED_LIMITS.min,
    GROWTH_SPEED_LIMITS.max,
    GROWTH_SPEED_LIMITS.default,
  )
}

function normalizeFinite(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(minimum, value))
}
