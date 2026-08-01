import { describe, expect, it } from 'vitest'
import {
  easeGrowthProgress,
  getGrowthDuration,
  linearizeGrowthProgress,
  normalizeGrowthProgress,
  normalizeGrowthSpeed,
} from './growth-animation'

describe('growth animation', () => {
  it('scales the bounded base duration by playback speed', () => {
    expect(getGrowthDuration(0, 1)).toBe(2_400)
    expect(getGrowthDuration(10_000, 1)).toBe(3_000)
    expect(getGrowthDuration(100_000, 1)).toBe(6_500)
    expect(getGrowthDuration(10_000, 2)).toBe(1_500)
    expect(getGrowthDuration(0, 0.01)).toBe(9_600)
  })

  it('round-trips eased progress when playback resumes', () => {
    const eased = easeGrowthProgress(0.5)

    expect(eased).toBe(0.875)
    expect(linearizeGrowthProgress(eased)).toBeCloseTo(0.5)
  })

  it('normalizes progress and speed at their safety boundaries', () => {
    expect(normalizeGrowthProgress(-1)).toBe(0)
    expect(normalizeGrowthProgress(2)).toBe(1)
    expect(normalizeGrowthProgress(Number.NaN)).toBe(0)
    expect(normalizeGrowthSpeed(0)).toBe(0.25)
    expect(normalizeGrowthSpeed(4)).toBe(3)
    expect(normalizeGrowthSpeed(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
