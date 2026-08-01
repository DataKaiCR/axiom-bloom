<script lang="ts">
  import { onMount } from 'svelte'
  import {
    ARTWORK_LIMITS,
    ARTWORK_QUERY_PARAMETER,
    MAX_SEED_LENGTH,
    decodeArtworkState,
    encodeArtworkState,
    type ArtworkState,
    type ArtworkStateFailureReason,
  } from './lib/engine/artwork-state'
  import {
    MAX_PRODUCTION_RULES,
    validateGrammar,
    type GrammarIssueField,
    type ProductionRuleDraft,
  } from './lib/engine/grammar'
  import {
    GROWTH_SPEED_LIMITS,
    easeGrowthProgress,
    getGrowthDuration,
    linearizeGrowthProgress,
    normalizeGrowthProgress,
    normalizeGrowthSpeed,
  } from './lib/growth-animation'
  import { PRESETS, getPreset } from './lib/engine/presets'
  import type {
    GenerationResponse,
    Geometry,
    LSystemPreset,
  } from './lib/engine/types'
  import SpecimenLibrary from './lib/components/SpecimenLibrary.svelte'
  import { renderCanvas, type RenderStyle } from './lib/render/canvas'
  import { createSvg, downloadSvg } from './lib/render/svg'
  import {
    VIEWPORT_LIMITS,
    VIEWPORT_STORAGE_KEY,
    createDefaultViewport,
    isDefaultViewport,
    panViewport,
    parseViewport,
    serializeViewport,
    zoomViewportAt,
    type ViewportPoint,
    type ViewportState,
  } from './lib/viewport'

  interface EditableRule extends ProductionRuleDraft {
    id: number
  }

  interface ShareFeedback {
    tone: 'success' | 'error'
    message: string
  }

  interface PointerPosition {
    x: number
    y: number
  }

  interface ViewportGesture {
    viewport: ViewportState
    anchor: ViewportPoint
    distance: number
  }

  const initialPreset = PRESETS[0]
  const seedWords = ['moss', 'lumen', 'fern', 'ember', 'dawn', 'willow', 'echo', 'rain']
  const activePointers = new Map<number, PointerPosition>()

  let canvas: HTMLCanvasElement
  let viewportSurface: HTMLButtonElement
  let worker: Worker
  let resizeObserver: ResizeObserver
  let animationFrame = 0
  let latestRequest = 0
  let nextRuleId = 0
  let shareFeedbackTimer = 0
  let viewportGesture: ViewportGesture | null = null

  let workerReady = $state(false)
  let browserReady = $state(false)
  let urlSyncEnabled = $state(false)
  let presetId = $state(initialPreset.id)
  let generations = $state(initialPreset.defaultGenerations)
  let angle = $state(initialPreset.angle)
  let jitter = $state(initialPreset.turnJitter)
  let wind = $state(0)
  let gravity = $state(0)
  let seed = $state(initialPreset.seed)
  let rootColor = $state(initialPreset.appearance.palette.root)
  let crownColor = $state(initialPreset.appearance.palette.crown)
  let accentColor = $state(initialPreset.appearance.palette.accent)
  let trunkWidth = $state(initialPreset.appearance.trunkWidth)
  let taper = $state(initialPreset.appearance.taper)
  let glow = $state(initialPreset.appearance.glow)
  let showTips = $state(initialPreset.appearance.showTips)
  let grammarAxiom = $state(initialPreset.axiom)
  let grammarRules = $state<EditableRule[]>(createEditableRules(initialPreset.rules))
  let geometry = $state<Geometry | null>(null)
  let status = $state<'starting' | 'growing' | 'ready' | 'invalid' | 'error'>('starting')
  let errorMessage = $state('')
  let elapsedMs = $state(0)
  let shareFeedback = $state<ShareFeedback | null>(null)
  let viewport = $state<ViewportState>(createDefaultViewport())
  let viewportDragging = $state(false)
  let growthProgress = $state(1)
  let growthSpeed = $state<number>(GROWTH_SPEED_LIMITS.default)
  let growthPlaying = $state(false)

  let selectedPreset = $derived(getPreset(presetId))
  let grammarValidation = $derived(validateGrammar(grammarAxiom, grammarRules))
  let axiomError = $derived(
    grammarValidation.issues.find((issue) => issue.field === 'axiom')?.message ?? '',
  )
  let rulesError = $derived(
    grammarValidation.issues.find((issue) => issue.field === 'rules')?.message ?? '',
  )
  let grammarDirty = $derived.by(() => {
    const presetRules = Object.entries(selectedPreset.rules)
    return (
      grammarAxiom !== selectedPreset.axiom ||
      grammarRules.length !== presetRules.length ||
      grammarRules.some(
        (rule, index) =>
          rule.symbol !== presetRules[index]?.[0] ||
          rule.replacement !== presetRules[index]?.[1],
      )
    )
  })
  let activePreset = $derived<LSystemPreset>({
    ...selectedPreset,
    axiom: grammarValidation.axiom,
    rules: grammarValidation.rules,
  })
  let viewportAtDefault = $derived(isDefaultViewport(viewport))
  let growthPercent = $derived(Math.round(growthProgress * 100))
  let growthActionLabel = $derived(
    growthPlaying
      ? 'Pause growth'
      : growthPercent >= 100
        ? 'Replay growth'
        : 'Play growth',
  )
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

    const validation = grammarValidation
    if (!validation.valid) {
      latestRequest += 1
      status = 'invalid'
      errorMessage = ''
      return
    }

    const request = {
      preset: activePreset,
      settings: {
        generations,
        angle,
        turnJitter: jitter,
        wind,
        gravity,
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
    const nextViewport = viewport
    const nextProgress = growthProgress

    if (canvas && nextGeometry) {
      renderCanvas(canvas, nextGeometry, nextStyle, nextViewport, nextProgress)
    }
  })

  $effect(() => {
    if (!browserReady) return

    const nextViewport = viewport
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          VIEWPORT_STORAGE_KEY,
          serializeViewport(nextViewport),
        )
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }, 150)

    return () => window.clearTimeout(timeout)
  })

  $effect(() => {
    if (!browserReady || !urlSyncEnabled) return

    const validation = grammarValidation
    if (!validation.valid) {
      updateArtworkUrl(null)
      return
    }

    const encoded = encodeArtworkState(createArtworkState())
    const timeout = window.setTimeout(() => {
      updateArtworkUrl(encoded.ok ? encoded.value : null)
    }, 120)

    return () => window.clearTimeout(timeout)
  })

  onMount(() => {
    restoreViewport()
    hydrateArtworkFromUrl()

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
      replayGrowth()
    }

    worker.onerror = () => {
      pauseGrowth()
      status = 'error'
      errorMessage = 'The generation worker stopped unexpectedly.'
    }

    resizeObserver = new ResizeObserver(() => drawCurrentFrame())
    resizeObserver.observe(canvas)
    browserReady = true
    workerReady = true

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(shareFeedbackTimer)
      resizeObserver.disconnect()
      worker.terminate()
    }
  })

  function createEditableRules(rules: Record<string, string>): EditableRule[] {
    return createEditableRuleDrafts(
      Object.entries(rules).map(([symbol, replacement]) => ({ symbol, replacement })),
    )
  }

  function createEditableRuleDrafts(
    rules: readonly ProductionRuleDraft[],
  ): EditableRule[] {
    return rules.map((rule) => ({
      id: nextRuleId++,
      symbol: rule.symbol,
      replacement: rule.replacement,
    }))
  }

  function choosePreset(nextId: string): void {
    const next = getPreset(nextId)
    presetId = next.id
    generations = next.defaultGenerations
    angle = next.angle
    jitter = next.turnJitter
    wind = 0
    gravity = 0
    seed = next.seed
    rootColor = next.appearance.palette.root
    crownColor = next.appearance.palette.crown
    accentColor = next.appearance.palette.accent
    trunkWidth = next.appearance.trunkWidth
    taper = next.appearance.taper
    glow = next.appearance.glow
    showTips = next.appearance.showTips
    resetGrammar(next)
    recenterViewport()
  }

  function resetGrammar(preset: LSystemPreset = selectedPreset): void {
    grammarAxiom = preset.axiom
    grammarRules = createEditableRules(preset.rules)
  }

  function addRule(): void {
    if (grammarRules.length >= MAX_PRODUCTION_RULES) return
    grammarRules.push({ id: nextRuleId++, symbol: '', replacement: '' })
  }

  function removeRule(id: number): void {
    grammarRules = grammarRules.filter((rule) => rule.id !== id)
  }

  function grammarIssue(field: GrammarIssueField, ruleIndex: number): string {
    return (
      grammarValidation.issues.find(
        (issue) => issue.field === field && issue.ruleIndex === ruleIndex,
      )?.message ?? ''
    )
  }

  function restoreViewport(): void {
    try {
      const stored = parseViewport(window.localStorage.getItem(VIEWPORT_STORAGE_KEY))
      if (stored) viewport = stored
    } catch {
      // Keep the fitted viewport when storage is unavailable.
    }
  }

  function hydrateArtworkFromUrl(): void {
    const payload = new URLSearchParams(window.location.search).get(ARTWORK_QUERY_PARAMETER)
    if (payload === null) return

    const decoded = decodeArtworkState(payload)
    if (!decoded.ok) {
      showShareFeedback({ tone: 'error', message: shareLoadError(decoded.reason) })
      return
    }

    applyArtworkState(decoded.value)
    urlSyncEnabled = true
    showShareFeedback({ tone: 'success', message: 'Shared artwork restored.' })
  }

  function applyArtworkState(state: ArtworkState): void {
    presetId = state.presetId
    generations = state.generations
    angle = state.angle
    jitter = state.turnJitter
    wind = state.wind
    gravity = state.gravity
    seed = state.seed
    rootColor = state.palette.root
    crownColor = state.palette.crown
    accentColor = state.palette.accent
    trunkWidth = state.trunkWidth
    taper = state.taper
    glow = state.glow
    showTips = state.showTips
    grammarAxiom = state.axiom
    grammarRules = createEditableRuleDrafts(state.rules)
    viewport = state.viewport
  }

  function createArtworkState(): ArtworkState {
    return {
      presetId,
      axiom: grammarValidation.axiom,
      rules: grammarRules.map((rule) => ({
        symbol: rule.symbol,
        replacement: rule.replacement,
      })),
      generations,
      angle,
      turnJitter: jitter,
      wind,
      gravity,
      seed,
      palette: { root: rootColor, crown: crownColor, accent: accentColor },
      trunkWidth,
      taper,
      glow,
      showTips,
      viewport,
    }
  }

  async function copyShareLink(): Promise<void> {
    if (!grammarValidation.valid) return

    const encoded = encodeArtworkState(createArtworkState())
    if (!encoded.ok) {
      updateArtworkUrl(null)
      showShareFeedback({
        tone: 'error',
        message:
          encoded.reason === 'too-large'
            ? 'This artwork is too complex to fit in a share link.'
            : 'This artwork cannot be shared until its settings are valid.',
      })
      return
    }

    urlSyncEnabled = true
    const url = updateArtworkUrl(encoded.value)

    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.')
      await navigator.clipboard.writeText(url)
      showShareFeedback({ tone: 'success', message: 'Share link copied.' })
    } catch {
      showShareFeedback({
        tone: 'error',
        message: 'Share link is ready in the address bar, but could not be copied.',
      })
    }
  }

  function updateArtworkUrl(payload: string | null): string {
    const url = new URL(window.location.href)
    if (payload === null) {
      url.searchParams.delete(ARTWORK_QUERY_PARAMETER)
    } else {
      url.searchParams.set(ARTWORK_QUERY_PARAMETER, payload)
    }
    window.history.replaceState(window.history.state, '', url)
    return url.toString()
  }

  function showShareFeedback(feedback: ShareFeedback): void {
    window.clearTimeout(shareFeedbackTimer)
    shareFeedback = feedback
    shareFeedbackTimer = window.setTimeout(() => {
      shareFeedback = null
    }, 4_500)
  }

  function shareLoadError(reason: ArtworkStateFailureReason): string {
    if (reason === 'unsupported-version') {
      return 'This share link uses an unsupported version. Showing the default artwork.'
    }
    if (reason === 'too-large') {
      return 'This share link is too large. Showing the default artwork.'
    }
    return 'This share link could not be restored. Showing the default artwork.'
  }

  function handleCanvasPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    viewportSurface.focus({ preventScroll: true })
    viewportSurface.setPointerCapture(event.pointerId)
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    viewportDragging = true
    restartViewportGesture()
  }

  function handleCanvasPointerMove(event: PointerEvent): void {
    if (!activePointers.has(event.pointerId) || !viewportGesture) return

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const pointers = [...activePointers.values()]

    if (pointers.length === 1 && viewportGesture.distance === 0) {
      const current = normalizeCanvasPoint(pointers[0])
      viewport = panViewport(
        viewportGesture.viewport,
        current.x - viewportGesture.anchor.x,
        current.y - viewportGesture.anchor.y,
      )
      return
    }

    if (pointers.length >= 2 && viewportGesture.distance > 0) {
      const midpoint = pointerMidpoint(pointers[0], pointers[1])
      const distance = pointerDistance(pointers[0], pointers[1])
      const nextZoom = viewportGesture.viewport.zoom * distance / viewportGesture.distance
      viewport = zoomViewportAt(
        viewportGesture.viewport,
        nextZoom,
        viewportGesture.anchor,
        normalizeCanvasPoint(midpoint),
      )
    }
  }

  function handleCanvasPointerEnd(event: PointerEvent): void {
    activePointers.delete(event.pointerId)
    viewportDragging = activePointers.size > 0
    restartViewportGesture()
  }

  function handleCanvasWheel(event: WheelEvent): void {
    event.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? rect.height
        : 1
    const factor = Math.exp(-event.deltaY * deltaScale * 0.0015)
    viewport = zoomViewportAt(
      viewport,
      viewport.zoom * factor,
      normalizeCanvasPoint({ x: event.clientX, y: event.clientY }),
    )
  }

  function handleCanvasKeydown(event: KeyboardEvent): void {
    const panStep = 0.06
    let handled = true

    switch (event.key) {
      case '+':
      case '=':
        zoomViewportBy(1.25)
        break
      case '-':
      case '_':
        zoomViewportBy(0.8)
        break
      case '0':
      case 'Home':
        recenterViewport()
        break
      case 'ArrowLeft':
        viewport = panViewport(viewport, -panStep, 0)
        break
      case 'ArrowRight':
        viewport = panViewport(viewport, panStep, 0)
        break
      case 'ArrowUp':
        viewport = panViewport(viewport, 0, -panStep)
        break
      case 'ArrowDown':
        viewport = panViewport(viewport, 0, panStep)
        break
      default:
        handled = false
    }

    if (handled) event.preventDefault()
  }

  function zoomViewportBy(factor: number): void {
    viewport = zoomViewportAt(
      viewport,
      viewport.zoom * factor,
      { x: 0.5, y: 0.5 },
    )
  }

  function recenterViewport(): void {
    viewport = createDefaultViewport()
  }

  function restartViewportGesture(): void {
    const pointers = [...activePointers.values()]
    if (pointers.length === 0) {
      viewportGesture = null
      return
    }

    if (pointers.length === 1) {
      viewportGesture = {
        viewport: { ...viewport },
        anchor: normalizeCanvasPoint(pointers[0]),
        distance: 0,
      }
      return
    }

    viewportGesture = {
      viewport: { ...viewport },
      anchor: normalizeCanvasPoint(pointerMidpoint(pointers[0], pointers[1])),
      distance: Math.max(1, pointerDistance(pointers[0], pointers[1])),
    }
  }

  function normalizeCanvasPoint(point: PointerPosition): ViewportPoint {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (point.x - rect.left) / Math.max(1, rect.width),
      y: (point.y - rect.top) / Math.max(1, rect.height),
    }
  }

  function pointerMidpoint(
    first: PointerPosition,
    second: PointerPosition,
  ): PointerPosition {
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
  }

  function pointerDistance(first: PointerPosition, second: PointerPosition): number {
    return Math.hypot(second.x - first.x, second.y - first.y)
  }

  function replayGrowth(): void {
    if (!geometry) return
    pauseGrowth()
    growthProgress = 0
    playGrowth()
  }

  function toggleGrowthPlayback(): void {
    if (growthPlaying) {
      pauseGrowth()
      return
    }
    if (growthPercent >= 100) growthProgress = 0
    playGrowth()
  }

  function playGrowth(): void {
    if (!geometry) return
    window.cancelAnimationFrame(animationFrame)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      growthProgress = 1
      growthPlaying = false
      drawCurrentFrame()
      return
    }

    const startedAt = performance.now()
    const startingProgress = linearizeGrowthProgress(growthProgress)
    const duration = getGrowthDuration(geometry.segmentCount, growthSpeed)
    growthPlaying = true

    const tick = (timestamp: number) => {
      const linearProgress = Math.min(
        1,
        startingProgress + (timestamp - startedAt) / duration,
      )
      growthProgress = easeGrowthProgress(linearProgress)

      if (linearProgress < 1) {
        animationFrame = window.requestAnimationFrame(tick)
      } else {
        animationFrame = 0
        growthPlaying = false
      }
    }

    animationFrame = window.requestAnimationFrame(tick)
  }

  function pauseGrowth(): void {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
    growthPlaying = false
  }

  function scrubGrowth(event: Event): void {
    pauseGrowth()
    const input = event.currentTarget as HTMLInputElement
    growthProgress = normalizeGrowthProgress(Number(input.value) / 100)
  }

  function changeGrowthSpeed(event: Event): void {
    const wasPlaying = growthPlaying
    const input = event.currentTarget as HTMLInputElement
    growthSpeed = normalizeGrowthSpeed(Number(input.value))
    if (wasPlaying) playGrowth()
  }

  function drawCurrentFrame(): void {
    if (canvas && geometry) {
      renderCanvas(canvas, geometry, renderStyle, viewport, growthProgress)
    }
  }

  function randomizeSeed(): void {
    const values = new Uint32Array(2)
    crypto.getRandomValues(values)
    seed = `${seedWords[values[0] % seedWords.length]}-${seedWords[values[1] % seedWords.length]}-${(values[0] & 0xfff).toString(16)}`
  }

  function saveSvg(): void {
    if (!geometry || !grammarValidation.valid) return
    const filename = `${selectedPreset.id}-${slugify(seed)}.svg`
    downloadSvg(createSvg(geometry, renderStyle, `${selectedPreset.name} — Axiom Bloom`), filename)
  }

  function savePng(): void {
    if (!geometry || !grammarValidation.valid) return
    pauseGrowth()
    growthProgress = 1
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

  function formatWind(value: number): string {
    if (value === 0) return 'Calm'
    return `${Math.round(Math.abs(value) * 100)}% ${value < 0 ? '←' : '→'}`
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
      <span class="engine-status" class:error={status === 'error' || status === 'invalid'}>
        <i></i>
        {status === 'growing'
          ? 'Growing'
          : status === 'invalid'
            ? 'Review grammar'
            : status === 'error'
              ? 'Interrupted'
              : 'Engine ready'}
      </span>
      <button class="ghost-button" type="button" onclick={replayGrowth} disabled={!geometry}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68M4 4v4.68h4.68"/></svg>
        Replay
      </button>
      <button
        class="share-button"
        type="button"
        onclick={copyShareLink}
        disabled={!grammarValidation.valid}
        aria-label="Copy share link"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14"/>
        </svg>
        <span>Copy link</span>
      </button>
      <button
        class="export-button"
        type="button"
        onclick={saveSvg}
        disabled={!geometry || !grammarValidation.valid}
      >
        Export SVG
      </button>
    </div>
  </header>

  {#if shareFeedback}
    <p
      class="share-toast"
      class:error={shareFeedback.tone === 'error'}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {shareFeedback.message}
    </p>
  {/if}

  <main class="workspace">
    <section class="canvas-stage" aria-label="Generated artwork">
      <button
        bind:this={viewportSurface}
        class="viewport-surface"
        class:dragging={viewportDragging}
        type="button"
        aria-label="Interactive artwork viewport"
        aria-describedby="viewport-instructions"
        aria-keyshortcuts="+ - 0 Home ArrowUp ArrowDown ArrowLeft ArrowRight"
        onpointerdown={handleCanvasPointerDown}
        onpointermove={handleCanvasPointerMove}
        onpointerup={handleCanvasPointerEnd}
        onpointercancel={handleCanvasPointerEnd}
        onlostpointercapture={handleCanvasPointerEnd}
        onwheel={handleCanvasWheel}
        onkeydown={handleCanvasKeydown}
        ondblclick={recenterViewport}
      >
        <canvas bind:this={canvas}></canvas>
      </button>
      <span class="sr-only" id="viewport-instructions">
        Drag to pan. Use the wheel, plus and minus keys, or viewport controls to zoom.
        Press zero or Home to recenter.
      </span>

      <div class="viewport-toolbar">
        <div class="growth-controls" role="group" aria-label="Growth playback controls">
          <div class="growth-timeline">
            <button
              type="button"
              onclick={toggleGrowthPlayback}
              disabled={!geometry}
              aria-label={growthActionLabel}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {#if growthPlaying}
                  <path d="M8 5v14M16 5v14"/>
                {:else}
                  <path d="m8 5 11 7-11 7Z"/>
                {/if}
              </svg>
            </button>
            <label class="growth-progress-control">
              <span class="sr-only">Growth progress</span>
              <input
                id="growth-progress"
                type="range"
                min="0"
                max="100"
                step="1"
                value={growthPercent}
                oninput={scrubGrowth}
                disabled={!geometry}
                aria-label="Growth progress"
                aria-valuetext={`${growthPercent}% grown`}
              />
            </label>
            <output for="growth-progress" aria-label="Growth completion">{growthPercent}%</output>
          </div>
          <label class="growth-speed-control">
            <span>Speed</span>
            <input
              id="growth-speed"
              type="range"
              min={GROWTH_SPEED_LIMITS.min}
              max={GROWTH_SPEED_LIMITS.max}
              step="0.25"
              value={growthSpeed}
              oninput={changeGrowthSpeed}
              disabled={!geometry}
              aria-label="Growth speed"
            />
            <output for="growth-speed" aria-label="Growth speed value">{growthSpeed}×</output>
          </label>
        </div>
        <div class="viewport-controls" role="group" aria-label="Artwork viewport controls">
          <button
            type="button"
            onclick={() => zoomViewportBy(0.8)}
            disabled={viewport.zoom <= VIEWPORT_LIMITS.zoom.min}
            aria-label="Zoom out"
          >−</button>
          <output aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output>
          <button
            type="button"
            onclick={() => zoomViewportBy(1.25)}
            disabled={viewport.zoom >= VIEWPORT_LIMITS.zoom.max}
            aria-label="Zoom in"
          >+</button>
          <button
            class="recenter-button"
            type="button"
            onclick={recenterViewport}
            disabled={viewportAtDefault}
            aria-label="Recenter artwork"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 12h6M12 9v6"/>
            </svg>
          </button>
        </div>
        <span>Drag to pan · Scroll to zoom</span>
      </div>

      <div class="stage-heading">
        <span>
          {selectedPreset.category} / {generations} generations{grammarDirty ? ' / custom grammar' : ''}
        </span>
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

      <SpecimenLibrary
        artwork={createArtworkState()}
        grammarValid={grammarValidation.valid}
        onOpen={applyArtworkState}
      />

      <section class="control-section">
        <div class="section-heading"><span>Growth</span><small>Live</small></div>

        <label class="range-control">
          <span><b>Generations</b><output>{generations}</output></span>
          <input
            type="range"
            min="0"
            max={selectedPreset.maxGenerations}
            step="1"
            bind:value={generations}
            aria-label="Generations"
          />
        </label>

        <label class="range-control">
          <span><b>Turn angle</b><output>{angle.toFixed(1)}°</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.angle.min}
            max={ARTWORK_LIMITS.angle.max}
            step="0.5"
            bind:value={angle}
            aria-label="Turn angle"
          />
        </label>

        <label class="range-control">
          <span><b>Wildness</b><output>±{jitter.toFixed(1)}°</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.turnJitter.min}
            max={ARTWORK_LIMITS.turnJitter.max}
            step="0.5"
            bind:value={jitter}
            aria-label="Wildness"
          />
        </label>

        <label class="seed-control">
          <span>Seed</span>
          <div>
            <input
              type="text"
              bind:value={seed}
              maxlength={MAX_SEED_LENGTH}
              aria-label="Seed"
              spellcheck="false"
            />
            <button type="button" onclick={randomizeSeed} aria-label="Create a random seed">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
          </div>
        </label>
      </section>

      <section class="control-section">
        <div class="section-heading"><span>Environment</span><small>Bend + droop</small></div>

        <label class="range-control">
          <span><b>Wind</b><output>{formatWind(wind)}</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.wind.min}
            max={ARTWORK_LIMITS.wind.max}
            step="0.05"
            bind:value={wind}
            aria-label="Wind"
          />
        </label>

        <label class="range-control">
          <span><b>Gravity</b><output>{Math.round(gravity * 100)}% ↓</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.gravity.min}
            max={ARTWORK_LIMITS.gravity.max}
            step="0.05"
            bind:value={gravity}
            aria-label="Gravity"
          />
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
          <input
            type="range"
            min={ARTWORK_LIMITS.trunkWidth.min}
            max={ARTWORK_LIMITS.trunkWidth.max}
            step="0.1"
            bind:value={trunkWidth}
            aria-label="Weight"
          />
        </label>

        <label class="range-control compact">
          <span><b>Taper</b><output>{taper.toFixed(2)}</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.taper.min}
            max={ARTWORK_LIMITS.taper.max}
            step="0.01"
            bind:value={taper}
            aria-label="Taper"
          />
        </label>

        <label class="range-control compact">
          <span><b>Radiance</b><output>{glow.toFixed(0)}</output></span>
          <input
            type="range"
            min={ARTWORK_LIMITS.glow.min}
            max={ARTWORK_LIMITS.glow.max}
            step="1"
            bind:value={glow}
            aria-label="Radiance"
          />
        </label>

        <label class="toggle-control">
          <span><b>Terminal blooms</b><small>Mark the tips of each branch</small></span>
          <input type="checkbox" bind:checked={showTips} aria-label="Terminal blooms" />
          <i aria-hidden="true"></i>
        </label>
      </section>

      <section class="control-section grammar-section">
        <div class="section-heading grammar-heading">
          <span>Grammar</span>
          <small>{grammarRules.length} {grammarRules.length === 1 ? 'rule' : 'rules'}</small>
        </div>

        <label class="grammar-field" class:invalid={Boolean(axiomError)}>
          <span>Axiom</span>
          <input
            type="text"
            bind:value={grammarAxiom}
            aria-invalid={Boolean(axiomError)}
            aria-describedby={axiomError ? 'axiom-error' : undefined}
            maxlength="512"
            spellcheck="false"
          />
        </label>
        {#if axiomError}
          <p class="grammar-error" id="axiom-error">{axiomError}</p>
        {/if}

        <div class="grammar-rules">
          {#each grammarRules as rule, index (rule.id)}
            {@const symbolError = grammarIssue('symbol', index)}
            {@const replacementError = grammarIssue('replacement', index)}
            <div class="grammar-rule" class:invalid={Boolean(symbolError || replacementError)}>
              <label class="symbol-field">
                <span>Rule {index + 1} symbol</span>
                <input
                  type="text"
                  bind:value={rule.symbol}
                  aria-label={`Rule ${index + 1} symbol`}
                  aria-invalid={Boolean(symbolError)}
                  aria-describedby={symbolError ? `rule-${rule.id}-symbol-error` : undefined}
                  maxlength="1"
                  placeholder="F"
                  spellcheck="false"
                />
              </label>
              <i aria-hidden="true">→</i>
              <label class="replacement-field">
                <span>Rule {index + 1} production</span>
                <input
                  type="text"
                  bind:value={rule.replacement}
                  aria-label={`Rule ${index + 1} production`}
                  aria-invalid={Boolean(replacementError)}
                  aria-describedby={replacementError ? `rule-${rule.id}-production-error` : undefined}
                  maxlength="4096"
                  placeholder="Empty deletes the symbol"
                  spellcheck="false"
                />
              </label>
              <button
                type="button"
                onclick={() => removeRule(rule.id)}
                aria-label={`Remove rule ${rule.symbol || index + 1}`}
              >
                ×
              </button>
            </div>
            {#if symbolError}
              <p class="grammar-error rule-error" id={`rule-${rule.id}-symbol-error`}>
                {symbolError}
              </p>
            {/if}
            {#if replacementError}
              <p class="grammar-error rule-error" id={`rule-${rule.id}-production-error`}>
                {replacementError}
              </p>
            {/if}
          {/each}
        </div>

        {#if rulesError}
          <p class="grammar-error">{rulesError}</p>
        {/if}

        <div class="grammar-actions">
          <button
            class="add-rule-button"
            type="button"
            onclick={addRule}
            disabled={grammarRules.length >= MAX_PRODUCTION_RULES}
          >
            + Add rule
          </button>
          <button type="button" onclick={() => resetGrammar()} disabled={!grammarDirty}>
            Reset preset
          </button>
        </div>

        <p class:valid={grammarValidation.valid} class="grammar-state" aria-live="polite">
          {grammarValidation.valid
            ? grammarDirty
              ? 'Custom grammar is live.'
              : 'Preset grammar is live.'
            : 'Fix the highlighted fields to resume growth.'}
        </p>
      </section>

      <div class="download-row">
        <button
          type="button"
          onclick={savePng}
          disabled={!geometry || !grammarValidation.valid}
        >Save PNG</button>
        <button
          type="button"
          onclick={saveSvg}
          disabled={!geometry || !grammarValidation.valid}
        >Save SVG</button>
      </div>
    </aside>
  </main>
</div>
