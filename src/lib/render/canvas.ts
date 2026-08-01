import { SEGMENT_STRIDE, TIP_STRIDE, type Geometry, type Palette } from '../engine/types'

export interface RenderStyle {
  palette: Palette
  background: string
  trunkWidth: number
  taper: number
  glow: number
  showTips: boolean
}

export function renderCanvas(
  canvas: HTMLCanvasElement,
  geometry: Geometry,
  style: RenderStyle,
  progress = 1,
): void {
  const context = canvas.getContext('2d')
  if (!context) return

  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const pixelWidth = Math.round(width * pixelRatio)
  const pixelHeight = Math.round(height * pixelRatio)

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  drawBackground(context, width, height, style)

  if (geometry.segmentCount === 0) return

  const viewport = createViewport(geometry, width, height)
  const visibleSegments = Math.min(
    geometry.segmentCount,
    Math.ceil(geometry.segmentCount * clamp(progress, 0, 1)),
  )

  context.lineCap = 'round'
  context.lineJoin = 'round'

  for (let index = 0; index < visibleSegments; index += 1) {
    const offset = index * SEGMENT_STRIDE
    const depth = geometry.segments[offset + 4]
    const colorProgress = getColorProgress(index, depth, geometry)
    const color = interpolateColor(style.palette.root, style.palette.crown, colorProgress)

    context.beginPath()
    context.moveTo(viewport.x(geometry.segments[offset]), viewport.y(geometry.segments[offset + 1]))
    context.lineTo(
      viewport.x(geometry.segments[offset + 2]),
      viewport.y(geometry.segments[offset + 3]),
    )
    context.strokeStyle = color
    context.lineWidth = Math.max(0.7, style.trunkWidth * style.taper ** depth)
    context.shadowColor = color
    context.shadowBlur = style.glow
    context.stroke()
  }

  context.shadowBlur = 0

  if (style.showTips) {
    drawTips(context, geometry, style, viewport, visibleSegments)
  }
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: RenderStyle,
): void {
  context.fillStyle = style.background
  context.fillRect(0, 0, width, height)

  const ambient = context.createRadialGradient(
    width * 0.52,
    height * 0.46,
    0,
    width * 0.52,
    height * 0.46,
    Math.max(width, height) * 0.72,
  )
  ambient.addColorStop(0, withAlpha(style.palette.crown, 0.1))
  ambient.addColorStop(0.48, withAlpha(style.palette.root, 0.035))
  ambient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = ambient
  context.fillRect(0, 0, width, height)

  context.fillStyle = 'rgba(220, 255, 239, 0.18)'
  for (let index = 0; index < 42; index += 1) {
    const x = ((index * 73.17) % 101) * (width / 100)
    const y = ((index * index * 19.31 + 7) % 103) * (height / 102)
    const radius = index % 7 === 0 ? 0.85 : 0.45
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
}

function drawTips(
  context: CanvasRenderingContext2D,
  geometry: Geometry,
  style: RenderStyle,
  viewport: ReturnType<typeof createViewport>,
  visibleSegments: number,
): void {
  for (let offset = 0; offset < geometry.tips.length; offset += TIP_STRIDE) {
    const segmentIndex = geometry.tips[offset + 3]
    if (segmentIndex > visibleSegments) continue

    const depth = geometry.tips[offset + 2]
    const radius = Math.max(1.8, style.trunkWidth * style.taper ** depth * 0.72)
    const x = viewport.x(geometry.tips[offset])
    const y = viewport.y(geometry.tips[offset + 1])

    context.save()
    context.translate(x, y)
    context.rotate(Math.PI / 4)
    context.fillStyle = style.palette.accent
    context.shadowColor = style.palette.accent
    context.shadowBlur = style.glow + 5
    context.beginPath()
    context.roundRect(-radius, -radius, radius * 2, radius * 2, radius * 0.7)
    context.fill()
    context.restore()
  }
}

function createViewport(geometry: Geometry, width: number, height: number) {
  const { minX, minY, maxX, maxY } = geometry.bounds
  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)
  const padding = Math.max(32, Math.min(width, height) * 0.09)
  const scale = Math.min(
    (width - padding * 2) / contentWidth,
    (height - padding * 2) / contentHeight,
  )
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return {
    x: (value: number) => (value - centerX) * scale + width / 2,
    y: (value: number) => (value - centerY) * scale + height / 2,
  }
}

function getColorProgress(index: number, depth: number, geometry: Geometry): number {
  if (geometry.maxDepth > 0) {
    return Math.pow(depth / geometry.maxDepth, 0.72)
  }

  return index / Math.max(1, geometry.segmentCount - 1)
}

export function interpolateColor(start: string, end: string, amount: number): string {
  const from = parseHex(start)
  const to = parseHex(end)
  const progress = clamp(amount, 0, 1)
  const red = Math.round(from[0] + (to[0] - from[0]) * progress)
  const green = Math.round(from[1] + (to[1] - from[1]) * progress)
  const blue = Math.round(from[2] + (to[2] - from[2]) * progress)
  return `rgb(${red}, ${green}, ${blue})`
}

function withAlpha(color: string, alpha: number): string {
  const [red, green, blue] = parseHex(color)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function parseHex(color: string): [number, number, number] {
  const normalized = color.replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized
  const value = Number.parseInt(expanded, 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
