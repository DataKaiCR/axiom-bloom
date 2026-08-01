import { describe, expect, it } from 'vitest'
import { ExpansionLimitError, expandLSystem } from './expand'

describe('expandLSystem', () => {
  it('rewrites drawable symbols instead of hardcoding them', () => {
    expect(expandLSystem('F', { F: 'F-G+F', G: 'GG' }, 1)).toBe('F-G+F')
  })

  it('preserves symbols without a matching production', () => {
    expect(expandLSystem('A+B', { A: 'AB' }, 2)).toBe('ABB+B')
  })

  it('guards against runaway grammars', () => {
    expect(() => expandLSystem('X', { X: 'XXXX' }, 10, 1_000)).toThrow(
      ExpansionLimitError,
    )
  })
})
