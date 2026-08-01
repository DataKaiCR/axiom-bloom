export const MAX_AXIOM_SYMBOLS = 512
export const MAX_PRODUCTION_LENGTH = 4_096
export const MAX_PRODUCTION_RULES = 24

export interface ProductionRuleDraft {
  symbol: string
  replacement: string
}

export type GrammarIssueField = 'axiom' | 'rules' | 'symbol' | 'replacement'

export interface GrammarIssue {
  field: GrammarIssueField
  message: string
  ruleIndex?: number
}

export interface GrammarValidation {
  valid: boolean
  axiom: string
  rules: Record<string, string>
  issues: GrammarIssue[]
}

const PRODUCTION_SYMBOL = /^[A-Za-z0-9]$/
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export function validateGrammar(
  axiomInput: string,
  ruleDrafts: readonly ProductionRuleDraft[],
): GrammarValidation {
  const axiom = axiomInput.trim()
  const issues: GrammarIssue[] = []
  const rules: Record<string, string> = {}
  const seenSymbols = new Set<string>()

  if (axiom.length === 0) {
    issues.push({ field: 'axiom', message: 'Enter at least one symbol.' })
  } else if ([...axiom].length > MAX_AXIOM_SYMBOLS) {
    issues.push({
      field: 'axiom',
      message: `Keep the axiom under ${MAX_AXIOM_SYMBOLS.toLocaleString()} symbols.`,
    })
  } else if (CONTROL_CHARACTER.test(axiom)) {
    issues.push({ field: 'axiom', message: 'Control characters are not supported.' })
  } else {
    const branchIssue = validateBranches(axiom, 'Axiom')
    if (branchIssue) issues.push({ field: 'axiom', message: branchIssue })
  }

  if (ruleDrafts.length > MAX_PRODUCTION_RULES) {
    issues.push({
      field: 'rules',
      message: `Use at most ${MAX_PRODUCTION_RULES} production rules.`,
    })
  }

  ruleDrafts.forEach((draft, ruleIndex) => {
    const symbol = draft.symbol.trim()
    const label = symbol || `Rule ${ruleIndex + 1}`

    if (!PRODUCTION_SYMBOL.test(symbol)) {
      issues.push({
        field: 'symbol',
        ruleIndex,
        message: 'Use one letter or number.',
      })
    } else if (seenSymbols.has(symbol)) {
      issues.push({
        field: 'symbol',
        ruleIndex,
        message: `A rule for ${symbol} already exists.`,
      })
    } else {
      seenSymbols.add(symbol)
      rules[symbol] = draft.replacement
    }

    if ([...draft.replacement].length > MAX_PRODUCTION_LENGTH) {
      issues.push({
        field: 'replacement',
        ruleIndex,
        message: `Keep productions under ${MAX_PRODUCTION_LENGTH.toLocaleString()} symbols.`,
      })
    } else if (CONTROL_CHARACTER.test(draft.replacement)) {
      issues.push({
        field: 'replacement',
        ruleIndex,
        message: 'Control characters are not supported.',
      })
    } else {
      const branchIssue = validateBranches(draft.replacement, `Rule ${label}`)
      if (branchIssue) {
        issues.push({ field: 'replacement', ruleIndex, message: branchIssue })
      }
    }
  })

  return {
    valid: issues.length === 0,
    axiom,
    rules,
    issues,
  }
}

function validateBranches(value: string, label: string): string | null {
  let depth = 0

  for (const symbol of value) {
    if (symbol === '[') {
      depth += 1
    } else if (symbol === ']') {
      if (depth === 0) return `${label} has an unmatched closing bracket.`
      depth -= 1
    }
  }

  return depth > 0 ? `${label} has an unmatched opening bracket.` : null
}
