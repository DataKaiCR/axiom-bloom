<script lang="ts">
  import { onMount } from 'svelte'
  import { PRESETS, getPreset } from './lib/engine/presets'
  import type { GenerationResponse, Geometry } from './lib/engine/types'
  import { renderCanvas, type RenderStyle } from './lib/render/canvas'
  import { createSvg, downloadSvg } from './lib/render/svg'

  const initialPreset = PRESETS[0]
  const seedWords = ['moss', 'lumen', 'fern', 'ember', 'dawn', 'willow', 'echo', 'rain']

  let canvas: HTMLCanvasElement
  let worker: Worker
  let resizeObserver: ResizeObserver
  let animationFrame = 0
  let currentProgress = 1
  let latestRequest = 0

  let workerReady = $state(false)
  let presetId = $state(initialPreset.id)
  let generations = $state(initialPreset.defaultGenerations)
  let angle = $state(initialPreset.angle)
  let jitter = $state(initialPreset.turnJitter)
  let seed = $state(initialPreset.seed)
  let rootColor = $state(initialPreset.appearance.palette.root)
  let crownColor = $state(initialPreset.appearance.palette.crown)
  let accentColor = $state(initialPreset.appearance.palette.accent)
  let trunkWidth = $state(initialPreset.appearance.trunkWidth)
  let taper = $state(initialPreset.appearance.taper)
  let glow = $state(initialPreset.appearance.glow)
  let showTips = $state(initialPreset.appearance.showTips)
  let geometry = $state<Geometry | null>(null)
  let status = $state<'starting' | 'growing' | 'ready' | 'error'>('starting')
  let errorMessage = $state('')
  let elapsedMs = $state(0)

  let selectedPreset = $derived(getPreset(presetId))
  let renderStyle = $derived<RenderStyle>({
    palette: { root: rootColor, crown: crownColor, accent: accentColor },
    background: '#06100c',
    trunkWidth,
    taper,
    glow,
    showTips,
  })

  $effect(() => {
    if (!workerReady) return

    const request = {
      preset: selectedPreset,
      settings: {
        generations,
        angle,
        turnJitter: jitter,
        seed,
        maxSymbols: 500_000,
      },
    }

    const timeout = window.setTimeout(() => {
      latestRequest += 1
      status = 'growing'
      errorMessage = ''
      worker.postMessage({ id: latestRequest, ...request })
    }, 90)

    return () => window.clearTimeout(timeout)
  })

  $effect(() => {
    const nextGeometry = geometry
    const nextStyle = renderStyle

    if (canvas && nextGeometry) {
      renderCanvas(canvas, nextGeometry, nextStyle, currentProgress)
    }
  })

  onMount(() => {
    worker = new Worker(new URL('./lib/engine/engine.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      const response = event.data
      if (response.id !== latestRequest) return

      if (!response.ok) {
        status = 'error'
        errorMessage = response.message
        return
      }

      geometry = response.geometry
      elapsedMs = response.elapsedMs
      status = 'ready'
      startAnimation()
    }

    worker.onerror = () => {
      status = 'error'
      errorMessage = 'The generation worker stopped unexpectedly.'
    }

    resizeObserver = new ResizeObserver(() => drawCurrentFrame())
    resizeObserver.observe(canvas)
    workerReady = true

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      worker.terminate()
    }
  })

  function choosePreset(nextId: string): void {
    const next = getPreset(nextId)
    presetId = next.id
    generations = next.defaultGenerations
    angle = next.angle
    jitter = next.turnJitter
    seed = next.seed
    rootColor = next.appearance.palette.root
    crownColor = next.appearance.palette.crown
    accentColor = next.appearance.palette.accent
    trunkWidth = next.appearance.trunkWidth
    taper = next.appearance.taper
    glow = next.appearance.glow
    showTips = next.appearance.showTips
  }

  function startAnimation(): void {
    if (!geometry) return

    window.cancelAnimationFrame(animationFrame)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentProgress = 1
      drawCurrentFrame()
      return
    }

    const startedAt = performance.now()
    const duration = Math.min(6_500, Math.max(2_400, 1_800 + geometry.segmentCount * 0.12))
    currentProgress = 0

    const tick = (timestamp: number) => {
      const linearProgress = Math.min(1, (timestamp - startedAt) / duration)
      currentProgress = 1 - (1 - linearProgress) ** 3
      drawCurrentFrame()

      if (linearProgress < 1) {
        animationFrame = window.requestAnimationFrame(tick)
      }
    }

    animationFrame = window.requestAnimationFrame(tick)
  }

  function drawCurrentFrame(): void {
    if (canvas && geometry) {
      renderCanvas(canvas, geometry, renderStyle, currentProgress)
    }
  }

  function randomizeSeed(): void {
    const values = new Uint32Array(2)
    crypto.getRandomValues(values)
    seed = `${seedWords[values[0] % seedWords.length]}-${seedWords[values[1] % seedWords.length]}-${(values[0] & 0xfff).toString(16)}`
  }

  function saveSvg(): void {
    if (!geometry) return
    const filename = `${selectedPreset.id}-${slugify(seed)}.svg`
    downloadSvg(createSvg(geometry, renderStyle, `${selectedPreset.name} — Axiom Bloom`), filename)
  }

  function savePng(): void {
    if (!geometry) return
    currentProgress = 1
    drawCurrentFrame()
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedPreset.id}-${slugify(seed)}.png`
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value)
  }
</script>

<svelte:head>
  <title>{selectedPreset.name} — Axiom Bloom</title>
</svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="Axiom Bloom home">
      <span class="brand-mark" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span>
        <strong>Axiom Bloom</strong>
        <small>Art that grows from rules</small>
      </span>
    </a>

    <div class="top-actions">
      <span class="engine-status" class:error={status === 'error'}>
        <i></i>
        {status === 'growing' ? 'Growing' : status === 'error' ? 'Interrupted' : 'Engine ready'}
      </span>
      <button class="ghost-button" type="button" onclick={startAnimation} disabled={!geometry}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68M4 4v4.68h4.68"/></svg>
        Replay
      </button>
      <button class="export-button" type="button" onclick={saveSvg} disabled={!geometry}>
        Export SVG
      </button>
    </div>
  </header>

  <main class="workspace">
    <section class="canvas-stage" aria-label="Generated artwork">
      <canvas bind:this={canvas}></canvas>

      <div class="stage-heading">
        <span>{selectedPreset.category} / {generations} generations</span>
        <h1>{selectedPreset.name}</h1>
        <p>{selectedPreset.description}</p>
      </div>

      {#if status === 'error'}
        <div class="error-card">
          <strong>Growth halted</strong>
          <span>{errorMessage}</span>
        </div>
      {/if}

      <div class="stage-metrics" aria-live="polite">
        <div><span>Segments</span><strong>{geometry ? formatNumber(geometry.segmentCount) : '—'}</strong></div>
        <div><span>Symbols</span><strong>{geometry ? formatNumber(geometry.commandCount) : '—'}</strong></div>
        <div><span>Generated</span><strong>{geometry ? `${elapsedMs.toFixed(1)} ms` : '—'}</strong></div>
      </div>

      <div class="canvas-grain" aria-hidden="true"></div>
    </section>

    <aside class="studio-panel">
      <div class="panel-intro">
        <span class="eyebrow">Growth studio</span>
        <h2>Shape the system</h2>
        <p>Choose a grammar, then tune how its world unfolds.</p>
      </div>

      <section class="control-section preset-section">
        <div class="section-heading">
          <span>Specimen</span>
          <small>{PRESETS.length} systems</small>
        </div>
        <div class="preset-grid">
          {#each PRESETS as item}
            <button
              type="button"
              class:active={item.id === presetId}
              onclick={() => choosePreset(item.id)}
            >
              <i class={`preset-glyph glyph-${item.id}`} aria-hidden="true"></i>
              <span>{item.name}</span>
              <small>{item.category}</small>
            </button>
          {/each}
        </div>
      </section>

      <section class="control-section">
        <div class="section-heading"><span>Growth</span><small>Live</small></div>

        <label class="range-control">
          <span><b>Generations</b><output>{generations}</output></span>
          <input type="range" min="0" max={selectedPreset.maxGenerations} step="1" bind:value={generations} />
        </label>

        <label class="range-control">
          <span><b>Turn angle</b><output>{angle.toFixed(1)}°</output></span>
          <input type="range" min="0" max="180" step="0.5" bind:value={angle} />
        </label>

        <label class="range-control">
          <span><b>Wildness</b><output>±{jitter.toFixed(1)}°</output></span>
          <input type="range" min="0" max="25" step="0.5" bind:value={jitter} />
        </label>

        <label class="seed-control">
          <span>Seed</span>
          <div>
            <input type="text" bind:value={seed} spellcheck="false" />
            <button type="button" onclick={randomizeSeed} aria-label="Create a random seed">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
          </div>
        </label>
      </section>

      <section class="control-section">
        <div class="section-heading"><span>Surface</span><small>Style</small></div>
        <div class="color-row">
          <label><input type="color" bind:value={rootColor} /><span>Root</span></label>
          <label><input type="color" bind:value={crownColor} /><span>Crown</span></label>
          <label><input type="color" bind:value={accentColor} /><span>Bloom</span></label>
        </div>

        <label class="range-control compact">
          <span><b>Weight</b><output>{trunkWidth.toFixed(1)}</output></span>
          <input type="range" min="0.8" max="12" step="0.1" bind:value={trunkWidth} />
        </label>

        <label class="range-control compact">
          <span><b>Taper</b><output>{taper.toFixed(2)}</output></span>
          <input type="range" min="0.5" max="1" step="0.01" bind:value={taper} />
        </label>

        <label class="range-control compact">
          <span><b>Radiance</b><output>{glow.toFixed(0)}</output></span>
          <input type="range" min="0" max="18" step="1" bind:value={glow} />
        </label>

        <label class="toggle-control">
          <span><b>Terminal blooms</b><small>Mark the tips of each branch</small></span>
          <input type="checkbox" bind:checked={showTips} />
          <i aria-hidden="true"></i>
        </label>
      </section>

      <section class="control-section grammar-section">
        <div class="section-heading"><span>Grammar</span><small>L-system</small></div>
        <div class="grammar-row"><span>Axiom</span><code>{selectedPreset.axiom}</code></div>
        {#each Object.entries(selectedPreset.rules) as [symbol, replacement]}
          <div class="grammar-row"><span>{symbol}</span><code>{replacement}</code></div>
        {/each}
      </section>

      <div class="download-row">
        <button type="button" onclick={savePng} disabled={!geometry}>Save PNG</button>
        <button type="button" onclick={saveSvg} disabled={!geometry}>Save SVG</button>
      </div>
    </aside>
  </main>
</div>
