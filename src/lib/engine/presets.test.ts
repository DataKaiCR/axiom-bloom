import { describe, expect, it } from 'vitest'
import { expandLSystem } from './expand'
import { generateGeometry } from './geometry'
import { PRESETS } from './presets'

describe('built-in presets', () => {
  for (const preset of PRESETS) {
    it(`generates ${preset.name} within the safety limit`, () => {
      const geometry = generateGeometry(preset, {
        generations: preset.defaultGenerations,
        angle: preset.angle,
        turnJitter: preset.turnJitter,
        wind: 0,
        gravity: 0,
        tropism: 0,
        tropismAngle: 0,
        seed: preset.seed,
        maxSymbols: 500_000,
      })

      const largestAllowedGeneration = expandLSystem(
        preset.axiom,
        preset.rules,
        preset.maxGenerations,
        500_000,
      )

      expect(geometry.segmentCount).toBeGreaterThan(0)
      expect(geometry.commandCount).toBeLessThanOrEqual(500_000)
      expect(largestAllowedGeneration.length).toBeLessThanOrEqual(500_000)
      expect(Number.isFinite(geometry.bounds.minX)).toBe(true)
      expect(Number.isFinite(geometry.bounds.maxY)).toBe(true)
    })
  }
})
