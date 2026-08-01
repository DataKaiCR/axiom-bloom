export const SEGMENT_STRIDE = 5
export const TIP_STRIDE = 4

export interface Palette {
  root: string
  crown: string
  accent: string
}

export interface PresetAppearance {
  palette: Palette
  trunkWidth: number
  taper: number
  glow: number
  showTips: boolean
}

export interface LSystemPreset {
  id: string
  name: string
  category: string
  description: string
  axiom: string
  rules: Record<string, string>
  drawSymbols: string[]
  moveSymbols?: string[]
  defaultGenerations: number
  maxGenerations: number
  angle: number
  turnJitter: number
  step: number
  startAngle: number
  seed: string
  appearance: PresetAppearance
}

export interface GenerationSettings {
  generations: number
  angle: number
  turnJitter: number
  wind: number
  gravity: number
  seed: string
  maxSymbols: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Geometry {
  /** Repeating x1, y1, x2, y2, branchDepth values. */
  segments: Float32Array
  /** Repeating x, y, branchDepth, segmentIndex values. */
  tips: Float32Array
  bounds: Bounds
  maxDepth: number
  commandCount: number
  segmentCount: number
}

export interface GenerationRequest {
  id: number
  preset: LSystemPreset
  settings: GenerationSettings
}

export type GenerationResponse =
  | { id: number; ok: true; geometry: Geometry; elapsedMs: number }
  | { id: number; ok: false; message: string }
