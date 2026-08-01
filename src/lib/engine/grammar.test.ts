import { describe, expect, it } from 'vitest'
import {
  MAX_AXIOM_SYMBOLS,
  MAX_PRODUCTION_RULES,
  validateGrammar,
} from './grammar'

describe('validateGrammar', () => {
  it('normalizes a valid grammar into worker-ready rules', () => {
    const result = validateGrammar('  X  ', [
      { symbol: 'X', replacement: 'F[+X]-X' },
      { symbol: 'F', replacement: 'FF' },
    ])

    expect(result.valid).toBe(true)
    expect(result.axiom).toBe('X')
    expect(result.rules).toEqual({ X: 'F[+X]-X', F: 'FF' })
    expect(result.issues).toEqual([])
  })

  it('rejects empty and oversized axioms', () => {
    expect(validateGrammar('   ', []).issues).toContainEqual({
      field: 'axiom',
      message: 'Enter at least one symbol.',
    })
    expect(validateGrammar('F'.repeat(MAX_AXIOM_SYMBOLS + 1), []).valid).toBe(false)
  })

  it('rejects duplicate and malformed production symbols', () => {
    const result = validateGrammar('F', [
      { symbol: 'F', replacement: 'FF' },
      { symbol: 'F', replacement: 'F' },
      { symbol: '+', replacement: 'F' },
    ])

    expect(result.issues).toContainEqual({
      field: 'symbol',
      ruleIndex: 1,
      message: 'A rule for F already exists.',
    })
    expect(result.issues).toContainEqual({
      field: 'symbol',
      ruleIndex: 2,
      message: 'Use one letter or number.',
    })
  })

  it('reports malformed branches before generation reaches the worker', () => {
    const axiom = validateGrammar('F]', [])
    const production = validateGrammar('F', [{ symbol: 'F', replacement: 'F[' }])

    expect(axiom.issues[0]?.message).toBe('Axiom has an unmatched closing bracket.')
    expect(production.issues[0]?.message).toBe(
      'Rule F has an unmatched opening bracket.',
    )
  })

  it('allows an empty production to delete a symbol', () => {
    const result = validateGrammar('FX', [{ symbol: 'X', replacement: '' }])

    expect(result.valid).toBe(true)
    expect(result.rules).toEqual({ X: '' })
  })

  it('caps the number of editable production rules', () => {
    const drafts = Array.from({ length: MAX_PRODUCTION_RULES + 1 }, (_, index) => ({
      symbol: String(index % 10),
      replacement: 'F',
    }))

    expect(validateGrammar('F', drafts).issues).toContainEqual({
      field: 'rules',
      message: `Use at most ${MAX_PRODUCTION_RULES} production rules.`,
    })
  })
})
