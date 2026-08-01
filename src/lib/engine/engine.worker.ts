/// <reference lib="webworker" />

import { generateGeometry } from './geometry'
import type { GenerationRequest, GenerationResponse } from './types'

const workerScope = self as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = (event: MessageEvent<GenerationRequest>) => {
  const { id, preset, settings } = event.data
  const startedAt = performance.now()

  try {
    const geometry = generateGeometry(preset, settings)
    const response: GenerationResponse = {
      id,
      ok: true,
      geometry,
      elapsedMs: performance.now() - startedAt,
    }

    workerScope.postMessage(response, [geometry.segments.buffer, geometry.tips.buffer])
  } catch (error) {
    const response: GenerationResponse = {
      id,
      ok: false,
      message: error instanceof Error ? error.message : 'Generation failed unexpectedly.',
    }
    workerScope.postMessage(response)
  }
}

export {}
