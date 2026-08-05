import { describe, expect, it } from 'vitest'
import { ExpansionLimitError, expandLSystem } from './expand'
import { generateGeometry } from './geometry'
import { CANONICAL_SYSTEMS, PRESETS } from './presets'

const CANONICAL_SEGMENT_COUNTS: Record<string, number> = {
  'binary-tree': 6_144,
  'koch-snowflake': 3_072,
  'hilbert-curve': 4_095,
  'cantor-set': 128,
  'gosper-curve': 2_401,
}

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
      if (preset.id in CANONICAL_SEGMENT_COUNTS) {
        expect(geometry.segmentCount).toBe(CANONICAL_SEGMENT_COUNTS[preset.id])
      }
      expect(geometry.commandCount).toBeLessThanOrEqual(500_000)
      expect(largestAllowedGeneration.length).toBeLessThanOrEqual(500_000)
      expect(Number.isFinite(geometry.bounds.minX)).toBe(true)
      expect(Number.isFinite(geometry.bounds.maxY)).toBe(true)
    })
  }

  it('uses unique identifiers across studio and canonical systems', () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length)
  })
})

describe('canonical system collection', () => {
  it('covers distinct turtle and rewriting capabilities', () => {
    const systems = Object.fromEntries(
      CANONICAL_SYSTEMS.map((preset) => [preset.id, preset]),
    )

    expect(systems['binary-tree'].rules['0']).toContain('[')
    expect(systems['koch-snowflake'].axiom).toBe('F--F--F')
    expect(Object.keys(systems['hilbert-curve'].rules)).toEqual(['A', 'B'])
    expect(systems['cantor-set'].moveSymbols).toEqual(['B'])
    expect(systems['gosper-curve'].drawSymbols).toEqual(['A', 'B'])
  })

  for (const preset of CANONICAL_SYSTEMS) {
    it(`sets ${preset.name} at the last safe generation`, () => {
      expect(() =>
        expandLSystem(
          preset.axiom,
          preset.rules,
          preset.maxGenerations + 1,
          500_000,
        ),
      ).toThrow(ExpansionLimitError)
    })
  }
})
