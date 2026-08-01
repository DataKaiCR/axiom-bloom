import { SEGMENT_STRIDE, TIP_STRIDE, type Geometry } from '../engine/types'
import { interpolateColor, type RenderStyle } from './canvas'

const EXPORT_WIDTH = 1600
const EXPORT_HEIGHT = 1000

export function createSvg(
  geometry: Geometry,
  style: RenderStyle,
  title: string,
): string {
  const { minX, minY, maxX, maxY } = geometry.bounds
  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)
  const padding = Math.max(contentWidth, contentHeight) * 0.08
  const viewBox = [
    minX - padding,
    minY - padding,
    contentWidth + padding * 2,
    contentHeight + padding * 2,
  ]
  const worldPerPixel = Math.max(viewBox[2] / EXPORT_WIDTH, viewBox[3] / EXPORT_HEIGHT)
  const paths = new Map<string, { color: string; width: number; commands: string[] }>()

  for (let index = 0; index < geometry.segmentCount; index += 1) {
    const offset = index * SEGMENT_STRIDE
    const depth = geometry.segments[offset + 4]
    const progress = geometry.maxDepth > 0
      ? Math.pow(depth / geometry.maxDepth, 0.72)
      : index / Math.max(1, geometry.segmentCount - 1)
    const bucket = geometry.maxDepth > 0 ? depth : Math.floor(progress * 20)
    const key = `${depth}:${bucket}`
    const entry = paths.get(key) ?? {
      color: interpolateColor(style.palette.root, style.palette.crown, progress),
      width: Math.max(0.7, style.trunkWidth * style.taper ** depth) * worldPerPixel,
      commands: [],
    }

    entry.commands.push(
      `M${format(geometry.segments[offset])} ${format(geometry.segments[offset + 1])}` +
      `L${format(geometry.segments[offset + 2])} ${format(geometry.segments[offset + 3])}`,
    )
    paths.set(key, entry)
  }

  const pathMarkup = [...paths.values()]
    .map(
      (path) =>
        `<path d="${path.commands.join('')}" fill="none" stroke="${path.color}" ` +
        `stroke-width="${format(path.width)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n    ')

  const tips = style.showTips
    ? createTipMarkup(geometry, style, worldPerPixel)
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_WIDTH}" height="${EXPORT_HEIGHT}" viewBox="${viewBox.map(format).join(' ')}">
  <title>${escapeXml(title)}</title>
  <rect x="${format(viewBox[0])}" y="${format(viewBox[1])}" width="${format(viewBox[2])}" height="${format(viewBox[3])}" fill="${style.background}"/>
  <g style="filter: drop-shadow(0 0 ${Math.max(0, style.glow * worldPerPixel)}px ${style.palette.crown})">
    ${pathMarkup}
    ${tips}
  </g>
</svg>
`
}

export function downloadSvg(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function createTipMarkup(
  geometry: Geometry,
  style: RenderStyle,
  worldPerPixel: number,
): string {
  const circles: string[] = []

  for (let offset = 0; offset < geometry.tips.length; offset += TIP_STRIDE) {
    const depth = geometry.tips[offset + 2]
    const radius = Math.max(1.8, style.trunkWidth * style.taper ** depth * 0.72) * worldPerPixel
    circles.push(
      `<circle cx="${format(geometry.tips[offset])}" cy="${format(geometry.tips[offset + 1])}" ` +
      `r="${format(radius)}" fill="${style.palette.accent}"/>`,
    )
  }

  return circles.join('\n    ')
}

function format(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    }
    return entities[character]
  })
}
