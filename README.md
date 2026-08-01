# Axiom Bloom

**Art that grows from rules.**

Axiom Bloom is an interactive generative-art studio for exploring Lindenmayer systems. It grows botanical forms, recursive curves, and geometric structures in real time, with seeded variation and export-ready output.

## Highlights

- Correct, symbol-agnostic L-system rewriting
- Deterministic seeded variation
- Web Worker generation with a 500,000-symbol safety limit
- Animated, depth-aware Canvas rendering with pan and zoom navigation
- Editable axioms and production rules with inline validation
- Versioned share links that restore complete, deterministic artworks
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

## Navigating the canvas

Drag with a mouse, pen, or one finger to pan. Use the wheel, a two-finger pinch, the on-canvas controls, or the plus and minus keys to zoom around the current focal point. The recenter control, zero key, Home key, or a double-click restores the fitted view.

The viewport is saved locally and restored on reload. PNG export captures the current Canvas composition; SVG export remains fitted to the complete generated artwork.

## Sharing artwork

Use **Copy link** to create a versioned URL containing the specimen, grammar, generation settings, seed, palette, branch styling, glow, terminal-bloom preference, and viewport composition. Once sharing is enabled, later valid edits keep that URL synchronized without reloading the page.

Share data is stored in one URL-safe `art` query parameter and is limited to 8,192 encoded characters. Version-two links include viewport state, while version-one links remain supported with a fitted view. Malformed, oversized, invalid, or unsupported versions fall back to the default artwork instead of reaching the worker.

## Legacy prototype

The original Python/Turtle concept is preserved in [`legacy/python`](legacy/python) and in the `0.1.0` Git tag.

## License

MIT
