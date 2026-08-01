# Axiom Bloom

**Art that grows from rules.**

Axiom Bloom is an interactive generative-art studio for exploring Lindenmayer systems. It grows botanical forms, recursive curves, and geometric structures in real time, with seeded variation and export-ready output.

## Highlights

- Correct, symbol-agnostic L-system rewriting
- Deterministic seeded variation
- Web Worker generation with a 500,000-symbol safety limit
- Animated, depth-aware Canvas rendering
- Editable axioms and production rules with inline validation
- Live generation, angle, palette, taper, glow, and seed controls
- Built-in botanical, dragon curve, and Sierpiński presets
- PNG and consolidated SVG export
- Responsive and reduced-motion-aware interface

## Development

Requires a current Node.js release (Node 24 or newer is recommended).

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run check
npm run build

# Optional browser suite (first run: npx playwright install chromium)
npm run test:e2e
```

## Architecture

```text
src/
├── lib/engine/       Pure grammar expansion, seeded RNG, turtle geometry, presets
├── lib/render/       Canvas renderer and SVG exporter
├── App.svelte        Interactive studio shell
└── app.css           Visual system and responsive layout
```

The engine is independent of Svelte and Canvas. Generation runs behind a worker boundary so a future Rust/WASM implementation can replace the computational core without changing the application or renderers.

## Editing grammars

Choose a specimen, then edit its axiom and production rows in the Grammar panel. Production symbols use one letter or number; branch brackets must balance within the axiom and each production. An empty production deletes its symbol. Invalid drafts are highlighted immediately and never reach the worker, so the canvas keeps the last valid artwork until the grammar is repaired or reset.

The selected specimen still defines which symbols draw or move the turtle, along with its step size and starting angle. This makes it possible to experiment with rewriting rules without losing the specimen's visual interpretation.

## Legacy prototype

The original Python/Turtle concept is preserved in [`legacy/python`](legacy/python) and in the `0.1.0` Git tag.

## License

MIT
