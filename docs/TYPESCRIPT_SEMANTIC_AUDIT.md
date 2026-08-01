# TypeScript and Svelte Semantic Audit

This audit records the first parser-backed structural review of every TypeScript and Svelte file under `src/`. It used the project-locked TypeScript and Svelte compilers with the canonical dkproto `v0.2.17` observe-tier profile.

## Coverage

The post-remediation scan evaluated 23 files. All 23 were covered; none were degraded or unavailable. Semantic receipts were available for every file. The detailed parser reported five remaining advisory findings, all classified below.

## Finding dispositions

| Original location | Rule | Disposition | Rationale |
|---|---|---|---|
| `src/App.svelte:499` | dispatch branches | Accepted heuristic | `handleCanvasKeydown` is a finite accessibility-key map. Each case directly invokes one viewport action; replacing the switch with a registry would obscure the key contract without reducing responsibility. |
| `src/lib/engine/artwork-state.test.ts:30` | function length | False positive | The anonymous function is a Vitest `describe` container whose body declares independent test cases, not one production operation. |
| `src/lib/engine/geometry.ts:34` | function length | Remediated | Turtle state transitions, branch-stack handling, movement, and geometry completion were split into named helpers around an explicit interpreter state. |
| `src/lib/engine/grammar.test.ts:8` | function length advisory | False positive | The anonymous function is a Vitest suite container. The per-file protocol excludes test files; the whole-source corpus run retained them to measure analyzer behavior. |
| `src/lib/engine/grammar.ts:28` | function length advisory | Remediated | Axiom, rule-symbol, and replacement validation now have separate helpers and share a typed validation accumulator. |
| `src/lib/render/canvas.ts:13` | function length advisory | Remediated | Canvas preparation, segment drawing, background drawing, and tip drawing are separate rendering stages. |
| `src/lib/render/svg.ts:7` | function length advisory | Remediated | Viewport calculation and path-group serialization were separated from SVG document assembly. |
| `src/lib/specimen-library.test.ts:34` | function length | False positive | The finding spans the suite-level `describe` callback rather than an individual behavior. |
| `src/lib/specimen-library.ts:142` | function length advisory | Remediated | Storage-envelope parsing is now separate from bounded record salvage and deduplication. |
| `src/lib/viewport.test.ts:13` | function length advisory | False positive | The finding spans the suite-level `describe` callback rather than an individual behavior. |

No waiver or project-local replacement rule was added. The accepted findings remain visible so future growth can trigger another review.

## Regression evidence

Existing geometry, grammar, specimen-library, and browser tests protect the refactored behavior. SVG export now also has direct unit coverage for grouped paths, tip visibility, finite coordinates, and escaped metadata.

The authoritative project gates are:

```bash
npm test
npm run check
npm run build
npm run test:e2e
```
