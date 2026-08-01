# Axiom Bloom Agent Guide

Axiom Bloom is a public DataKai generative-art studio built with TypeScript, Svelte, Canvas, and SVG. The original Python/Turtle release is preserved in `legacy/python/` and should remain unchanged unless a legacy-specific fix is requested.

## Development

Use the repository scripts as the authoritative workflow:

```bash
npm install
npm run dev
npm test
npm run check
npm run build
npm run test:e2e
```

Keep the L-system engine in `src/lib/engine/` independent from Svelte and rendering. Heavy generation belongs behind the Web Worker boundary. Canvas is the interactive renderer; SVG is an export format.

## Quality

- TypeScript strict mode remains enabled.
- Avoid `any`, unchecked external data, disabled tests, debug statements, and incomplete implementations.
- Every grammar bug or safety-limit bug requires a falsifiable regression test.
- Test boundaries: empty axioms, malformed branches, expansion limits, deterministic seeds, worker failures, and browser responsiveness.
- Generated output, dependencies, and Playwright artifacts are not committed.

## Governance

This is a DataKai-owned public project. Public commit-message rules, no-AI-attribution rules, and the protocols declared in `.project.toml` apply. Keep public documentation free of private DataKai operational context. The support and reversibility boundary is documented in `docs/OPEN_SOURCE_POSTURE.md`.

Protocols must improve the project rather than merely recognize Python syntax. Record unsupported TypeScript, Svelte, Rust, Go, or Zig behavior as a kernel/OS governance gap instead of adding local one-off checks.
