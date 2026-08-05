# Axiom Bloom

**Art that grows from rules.**

Axiom Bloom is an interactive generative-art studio for exploring Lindenmayer systems. It grows botanical forms, recursive curves, and geometric structures in real time, with seeded variation and export-ready output.

## Highlights

- Correct, symbol-agnostic L-system rewriting
- Deterministic seeded variation
- Web Worker generation with a 500,000-symbol safety limit
- Animated, depth-aware Canvas rendering with playback, scrubbing, pan, and zoom controls
- Editable axioms and production rules with inline validation
- Versioned share links that restore complete, deterministic artworks
- A local specimen library for named custom artwork snapshots
- Live generation, wind, gravity, directional sunlight, seasons, palette, and styling controls
- Studio originals plus a safety-bounded collection of canonical L-systems
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
├── lib/components/   Reusable studio controls and local specimen library
├── App.svelte        Interactive studio shell
└── app.css           Visual system and responsive layout
```

The engine is independent of Svelte and Canvas. Generation runs behind a worker boundary so a future Rust/WASM implementation can replace the computational core without changing the application or renderers.

## Canonical systems

The built-in collection pairs the studio originals with five reference grammars:

- **Binary Tree** exercises branch-stack push and restore behavior.
- **Koch Snowflake** closes a single-symbol recursive curve.
- **Hilbert Curve** uses mutually recursive, non-drawing control symbols.
- **Cantor Set** alternates drawing and move-only symbols to preserve gaps.
- **Gosper Curve** lets both production symbols draw a hexagonal path.

Each canonical system sets its maximum generation to the highest value whose expanded command stream remains within the 500,000-symbol worker limit. They can be edited, animated, shared, saved, and exported like every other specimen.

## Editing grammars

Choose a specimen, then edit its axiom and production rows in the Grammar panel. Production symbols use one letter or number; branch brackets must balance within the axiom and each production. An empty production deletes its symbol. Invalid drafts are highlighted immediately and never reach the worker, so the canvas keeps the last valid artwork until the grammar is repaired or reset.

The selected specimen still defines which symbols draw or move the turtle, along with its step size and starting angle. This makes it possible to experiment with rewriting rules without losing the specimen's visual interpretation.

## Navigating the canvas

Drag with a mouse, pen, or one finger to pan. Use the wheel, a two-finger pinch, the on-canvas controls, or the plus and minus keys to zoom around the current focal point. The recenter control, zero key, Home key, or a double-click restores the fitted view.

The viewport is saved locally and restored on reload. PNG export captures the current viewport composition after completing growth; SVG export remains fitted to the complete generated artwork.

## Controlling growth

Use the on-canvas playback controls to pause or resume growth, drag the timeline to inspect any stage, and adjust playback from 0.25× to 3× speed. Replaying or generating new geometry starts from the root, while scrubbing pauses at the selected stage. Browsers requesting reduced motion show completed artwork immediately but still allow manual timeline inspection.

Playback progress and speed affect only the presentation; they do not change the deterministic artwork stored in links or local specimens.

## Shaping the environment

Use **Wind** to bend forward growth left or right and **Gravity** to pull lateral branches downward. Gravity responds more strongly along nested outer branches, creating visible crown and branch droop without tipping an upright trunk. **Sun pull** adds directional tropism: set a light direction, then increase its strength to steer each new segment toward that bearing. Zero degrees points up, positive angles turn clockwise, and negative angles turn counterclockwise.

Choose **Spring**, **Summer**, **Autumn**, or **Winter** to apply a deterministic seasonal palette treatment and a matching terminal mark: blossoms, leaves, falling leaves, or frost. Summer is the neutral treatment and preserves the selected surface colors exactly. Choosing another built-in specimen resets the environment to calm summer conditions.

Geometry forces run inside the worker, while seasonal styling is shared by the Canvas and SVG renderers. All environment settings are preserved in share links, local specimens, PNG exports, and SVG exports.

## Sharing artwork

Use **Copy link** to create a versioned URL containing the specimen, grammar, generation settings, environmental forces, season, seed, palette, branch styling, glow, terminal-bloom preference, and viewport composition. Once sharing is enabled, later valid edits keep that URL synchronized without reloading the page.

Share data is stored in one URL-safe `art` query parameter and is limited to 8,192 encoded characters. Version-four links include wind, gravity, directional tropism, and season. Version-three links retain wind and gravity with neutral sunlight and summer styling. Version-two links retain their saved viewport and version-one links open fitted; both remain supported with a neutral summer environment. Malformed, oversized, invalid, or unsupported versions fall back to the default artwork instead of reaching the worker.

## Saving specimens

Name the current artwork in **Local library** to save its complete grammar, appearance, seed, growth settings, and viewport in the browser. Up to 24 uniquely named specimens can be reopened or deleted with confirmation. Invalid or corrupted stored entries are skipped instead of being applied.

Local specimens do not sync between browsers or devices and are removed when site storage is cleared. Use a share link for portable artwork.

## Legacy prototype

The original Python/Turtle concept is preserved in [`legacy/python`](legacy/python) and in the `0.1.0` Git tag.

## License

MIT
