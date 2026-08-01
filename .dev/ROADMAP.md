# Axiom Bloom Implementation Roadmap

## Vision

Build a beautiful, fast, and approachable studio where people grow art from formal rules—and use the project as a real cross-language conformance case for DataKai governance.

## Foundation

- [x] Preserve the Python/Turtle release under `legacy/python/`
- [x] Establish the TypeScript/Svelte application
- [x] Separate grammar, geometry, rendering, and worker boundaries
- [x] Add deterministic seeds and expansion limits
- [x] Add Canvas animation plus PNG and SVG export
- [x] Add unit and desktop/mobile browser tests
- [x] Register the repository as a public DataKai project
- [x] Bootstrap DKOS context and hooks

## Interactive Studio

- [x] Add editable axioms and production rules with inline validation
- [x] Add pan, zoom, recenter, and viewport persistence
- [x] Encode reproducible artwork settings in shareable URLs
- [x] Add a preset browser with saved local specimens
- [x] Add pause, scrub, and growth-speed controls

## Generative Art

- [ ] Add wind, gravity, tropism, and seasonal effects
- [ ] Add stochastic weighted productions with deterministic seeds
- [ ] Add parametric symbols and age-aware branch styling
- [ ] Add richer leaves, blossoms, particles, and palette systems
- [ ] Evaluate an optional WebGL renderer only after Canvas profiling

## Public Project

- [x] Rename the public repository to `axiom-bloom`
- [ ] Add public issue and pull-request templates
- [x] Add automated CI for unit, type, build, and browser gates
- [ ] Measure public support time against the declared weekly cap

## Polyglot Governance Dogfood

- [ ] Publish a language-capability matrix from actual DKOS/dkkernel results
- [x] Verify TypeScript and Svelte files never receive silent zero-coverage passes
- [x] Run the parser-backed TypeScript/Svelte structural audit and classify every finding
- [x] Exercise equivalent fixtures for Python, Go, Rust, and Zig
- [ ] Record false positives, false negatives, degraded delegates, and unsupported files
- [x] Validate that public visibility selects public onboarding and commit rules
