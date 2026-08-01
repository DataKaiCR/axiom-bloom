import { describe, expect, it } from 'vitest'
import { interpretCommands } from './geometry'
import type { GenerationSettings, LSystemPreset } from './types'

const preset: LSystemPreset = {
  id: 'test',
  name: 'Test',
  category: 'Test',
  description: 'Test grammar',
  axiom: 'F',
  rules: {},
  drawSymbols: ['F'],
  defaultGenerations: 0,
  maxGenerations: 1,
  angle: 90,
  turnJitter: 0,
  step: 10,
  startAngle: -90,
  seed: 'test',
  appearance: {
    palette: { root: '#000000', crown: '#ffffff', accent: '#ffffff' },
    trunkWidth: 1,
    taper: 1,
    glow: 0,
    showTips: false,
  },
}

const settings: GenerationSettings = {
  generations: 0,
  angle: 90,
  turnJitter: 0,
  seed: 'repeatable',
  maxSymbols: 10_000,
}

describe('interpretCommands', () => {
  it('restores position and heading after a branch', () => {
    const geometry = interpretCommands('F[+F]F', preset, settings)
    const values = Array.from(geometry.segments)

    expect(geometry.segmentCount).toBe(3)
    expect(values[10]).toBeCloseTo(0)
    expect(values[11]).toBeCloseTo(-10)
    expect(values[12]).toBeCloseTo(0)
    expect(values[13]).toBeCloseTo(-20)
  })

  it('records branch and final endpoints as tips', () => {
    const geometry = interpretCommands('F[+F]F', preset, settings)

    const tips = Array.from(geometry.tips)
    expect(tips).toHaveLength(8)
    expect(tips[0]).toBeCloseTo(10)
    expect(tips[1]).toBeCloseTo(-10)
    expect(tips.slice(2, 4)).toEqual([1, 2])
    expect(tips[4]).toBeCloseTo(0)
    expect(tips[5]).toBeCloseTo(-20)
    expect(tips.slice(6)).toEqual([0, 3])
  })

  it('produces repeatable geometry for a seed', () => {
    const varied = { ...settings, turnJitter: 20 }
    const first = interpretCommands('F+F-F+F', preset, varied)
    const second = interpretCommands('F+F-F+F', preset, varied)

    expect(first.segments).toEqual(second.segments)
  })

  it('rejects malformed branch syntax', () => {
    expect(() => interpretCommands('F]', preset, settings)).toThrow(SyntaxError)
    expect(() => interpretCommands('[F', preset, settings)).toThrow(SyntaxError)
  })
})
