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

interface GrammarState {
  issues: GrammarIssue[]
  rules: Record<string, string>
  seenSymbols: Set<string>
}

export function validateGrammar(
  axiomInput: string,
  ruleDrafts: readonly ProductionRuleDraft[],
): GrammarValidation {
  const axiom = axiomInput.trim()
  const state: GrammarState = {
    issues: [],
    rules: {},
    seenSymbols: new Set(),
  }

  validateAxiom(axiom, state.issues)
  if (ruleDrafts.length > MAX_PRODUCTION_RULES) {
    state.issues.push({
      field: 'rules',
      message: `Use at most ${MAX_PRODUCTION_RULES} production rules.`,
    })
  }
  ruleDrafts.forEach((draft, index) => validateRuleDraft(draft, index, state))

  return {
    valid: state.issues.length === 0,
    axiom,
    rules: state.rules,
    issues: state.issues,
  }
}

function validateAxiom(axiom: string, issues: GrammarIssue[]): void {
  if (axiom.length === 0) {
    issues.push({ field: 'axiom', message: 'Enter at least one symbol.' })
    return
  }
  if ([...axiom].length > MAX_AXIOM_SYMBOLS) {
    issues.push({
      field: 'axiom',
      message: `Keep the axiom under ${MAX_AXIOM_SYMBOLS.toLocaleString()} symbols.`,
    })
    return
  }
  if (CONTROL_CHARACTER.test(axiom)) {
    issues.push({ field: 'axiom', message: 'Control characters are not supported.' })
    return
  }

  const branchIssue = validateBranches(axiom, 'Axiom')
  if (branchIssue) issues.push({ field: 'axiom', message: branchIssue })
}

function validateRuleDraft(
  draft: ProductionRuleDraft,
  ruleIndex: number,
  state: GrammarState,
): void {
  const symbol = draft.symbol.trim()
  const label = symbol || `Rule ${ruleIndex + 1}`
  validateRuleSymbol(symbol, draft.replacement, ruleIndex, state)
  validateReplacement(draft.replacement, label, ruleIndex, state.issues)
}

function validateRuleSymbol(
  symbol: string,
  replacement: string,
  ruleIndex: number,
  state: GrammarState,
): void {
  if (!PRODUCTION_SYMBOL.test(symbol)) {
    state.issues.push({
      field: 'symbol',
      ruleIndex,
      message: 'Use one letter or number.',
    })
    return
  }
  if (state.seenSymbols.has(symbol)) {
    state.issues.push({
      field: 'symbol',
      ruleIndex,
      message: `A rule for ${symbol} already exists.`,
    })
    return
  }

  state.seenSymbols.add(symbol)
  state.rules[symbol] = replacement
}

function validateReplacement(
  replacement: string,
  label: string,
  ruleIndex: number,
  issues: GrammarIssue[],
): void {
  if ([...replacement].length > MAX_PRODUCTION_LENGTH) {
    issues.push({
      field: 'replacement',
      ruleIndex,
      message: `Keep productions under ${MAX_PRODUCTION_LENGTH.toLocaleString()} symbols.`,
    })
    return
  }
  if (CONTROL_CHARACTER.test(replacement)) {
    issues.push({
      field: 'replacement',
      ruleIndex,
      message: 'Control characters are not supported.',
    })
    return
  }

  const branchIssue = validateBranches(replacement, `Rule ${label}`)
  if (branchIssue) {
    issues.push({ field: 'replacement', ruleIndex, message: branchIssue })
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
