# Contributing to Axiom Bloom

Thank you for helping grow Axiom Bloom. This is a public DataKai project for generative artists, creative coders, and people interested in L-systems.

## Development Setup

A current Node.js release is required; Node 24 or newer is recommended.

```bash
git clone https://github.com/DataKaiCR/visualizing-lsystems.git
cd visualizing-lsystems
npm install
npm run dev
```

The development server prints its local URL when ready.

## Project Structure

- `src/lib/engine/` contains pure grammar expansion, seeded randomness, geometry generation, and presets.
- `src/lib/render/` contains Canvas rendering and SVG export.
- `src/App.svelte` contains the interactive studio.
- `tests/e2e/` contains browser-level behavior checks.
- `legacy/python/` preserves the original Turtle concept and is not part of the web runtime.

Keep the engine independent from Svelte and rendering. Expensive generation belongs behind the Web Worker boundary.

## Quality Checks

Run the complete local gate before opening a pull request:

```bash
npm test
npm run check
npm run build
npx playwright install chromium  # first browser-suite run only
npm run test:e2e
```

Tests should be falsifiable: target malformed grammars, branch imbalance, expansion limits, determinism, worker failures, and browser behavior rather than implementation details.

TypeScript strict mode must remain enabled. Avoid `any`, disabled tests, debug statements, placeholders, and unfinished code. Do not commit generated output, dependencies, or Playwright artifacts.

## Commit Messages

Axiom Bloom follows the DataKai public-project convention:

- Begin with an imperative verb such as `Add`, `Fix`, `Improve`, or `Remove`.
- Keep the subject at 72 characters or fewer.
- Describe one logical change per commit.
- Do not use Conventional Commit prefixes such as `feat:` or `fix:`.
- Do not add AI attribution or generated-by trailers.

Example:

```text
Add deterministic wind controls to botanical presets
```

## Pull Requests

1. Branch from `main`.
2. Keep the change focused and explain its user-visible effect.
3. Add regression tests for engine or rendering defects.
4. Run the complete quality gate.
5. Update documentation when behavior or architecture changes.
6. Include screenshots or a short recording for visual changes.

## Issues and Support

A useful defect report includes reproduction steps, expected and actual behavior, browser and operating system details, and a minimal grammar or shared seed when relevant.

Support is best-effort and intentionally bounded. See [`docs/OPEN_SOURCE_POSTURE.md`](docs/OPEN_SOURCE_POSTURE.md) for the maintenance and licensing boundary.
