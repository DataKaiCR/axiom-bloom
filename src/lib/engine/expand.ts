export class ExpansionLimitError extends Error {
  constructor(
    public readonly limit: number,
    public readonly generation: number,
  ) {
    super(`Generation ${generation} would exceed the ${limit.toLocaleString()} symbol limit.`)
    this.name = 'ExpansionLimitError'
  }
}

export function expandLSystem(
  axiom: string,
  rules: Record<string, string>,
  generations: number,
  maxSymbols = 500_000,
): string {
  if (!Number.isInteger(generations) || generations < 0) {
    throw new RangeError('Generations must be a non-negative integer.')
  }

  if (axiom.length > maxSymbols) {
    throw new ExpansionLimitError(maxSymbols, 0)
  }

  let commands = axiom

  for (let generation = 1; generation <= generations; generation += 1) {
    const next: string[] = []
    let symbolCount = 0

    for (const symbol of commands) {
      const replacement = rules[symbol] ?? symbol
      symbolCount += replacement.length

      if (symbolCount > maxSymbols) {
        throw new ExpansionLimitError(maxSymbols, generation)
      }

      next.push(replacement)
    }

    commands = next.join('')
  }

  return commands
}
