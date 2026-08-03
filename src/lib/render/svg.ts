import { SEGMENT_STRIDE, TIP_STRIDE, type Geometry } from '../engine/types'
import { interpolateColor, type RenderStyle } from './canvas'
import {
  getSeasonalTipShape,
  resolveSeasonPalette,
  type SeasonalTipShape,
} from './season'

const EXPORT_WIDTH = 1600
const EXPORT_HEIGHT = 1000

interface SvgViewport {
  viewBox: [number, number, number, number]
  worldPerPixel: number
}

interface SvgPath {
  color: string
  width: number
  commands: string[]
}

export function createSvg(
  geometry: Geometry,
  style: RenderStyle,
  title: string,
): string {
  const viewport = createSvgViewport(geometry)
  const seasonalStyle = {
    ...style,
    palette: resolveSeasonPalette(style.palette, style.season),
  }
  const pathMarkup = createPathMarkup(
    geometry,
    seasonalStyle,
    viewport.worldPerPixel,
  )
  const tips = seasonalStyle.showTips
    ? createTipMarkup(geometry, seasonalStyle, viewport.worldPerPixel)
    : ''
  const viewBox = viewport.viewBox

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_WIDTH}" height="${EXPORT_HEIGHT}" viewBox="${viewBox.map(format).join(' ')}">
  <title>${escapeXml(title)}</title>
  <rect x="${format(viewBox[0])}" y="${format(viewBox[1])}" width="${format(viewBox[2])}" height="${format(viewBox[3])}" fill="${seasonalStyle.background}"/>
  <g data-season="${seasonalStyle.season}" style="filter: drop-shadow(0 0 ${Math.max(0, seasonalStyle.glow * viewport.worldPerPixel)}px ${seasonalStyle.palette.crown})">
    ${pathMarkup}
    ${tips}
  </g>
</svg>
`
}

function createSvgViewport(geometry: Geometry): SvgViewport {
  const { minX, minY, maxX, maxY } = geometry.bounds
  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)
  const padding = Math.max(contentWidth, contentHeight) * 0.08
  const viewBox: SvgViewport['viewBox'] = [
    minX - padding,
    minY - padding,
    contentWidth + padding * 2,
    contentHeight + padding * 2,
  ]

  return {
    viewBox,
    worldPerPixel: Math.max(
      viewBox[2] / EXPORT_WIDTH,
      viewBox[3] / EXPORT_HEIGHT,
    ),
  }
}

function createPathMarkup(
  geometry: Geometry,
  style: RenderStyle,
  worldPerPixel: number,
): string {
  const paths = new Map<string, SvgPath>()
  for (let index = 0; index < geometry.segmentCount; index += 1) {
    const offset = index * SEGMENT_STRIDE
    const depth = geometry.segments[offset + 4]
    const progress = geometry.maxDepth > 0
      ? Math.pow(depth / geometry.maxDepth, 0.72)
      : index / Math.max(1, geometry.segmentCount - 1)
    const bucket = geometry.maxDepth > 0 ? depth : Math.floor(progress * 20)
    const key = `${depth}:${bucket}`
    const path = paths.get(key) ?? {
      color: interpolateColor(style.palette.root, style.palette.crown, progress),
      width: Math.max(0.7, style.trunkWidth * style.taper ** depth) * worldPerPixel,
      commands: [],
    }
    path.commands.push(
      `M${format(geometry.segments[offset])} ${format(geometry.segments[offset + 1])}` +
      `L${format(geometry.segments[offset + 2])} ${format(geometry.segments[offset + 3])}`,
    )
    paths.set(key, path)
  }

  return [...paths.values()]
    .map(
      (path) =>
        `<path d="${path.commands.join('')}" fill="none" stroke="${path.color}" ` +
        `stroke-width="${format(path.width)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n    ')
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
  const marks: string[] = []
  const shape = getSeasonalTipShape(style.season)

  for (let offset = 0; offset < geometry.tips.length; offset += TIP_STRIDE) {
    const depth = geometry.tips[offset + 2]
    const radius = Math.max(
      1.8,
      style.trunkWidth * style.taper ** depth * 0.72,
    ) * worldPerPixel
    marks.push(createTipMark(
      geometry.tips[offset],
      geometry.tips[offset + 1],
      radius,
      style,
      shape,
    ))
  }

  return marks.join('\n    ')
}

function createTipMark(
  x: number,
  y: number,
  radius: number,
  style: RenderStyle,
  shape: SeasonalTipShape,
): string {
  if (shape === 'blossom') return createBlossomMark(x, y, radius, style)
  if (shape === 'leaf') return createLeafMark(x, y, radius, style)
  if (shape === 'falling-leaf') {
    return createFallingLeafMark(x, y, radius, style)
  }
  return createFrostMark(x, y, radius, style)
}

function createBlossomMark(
  x: number,
  y: number,
  radius: number,
  style: RenderStyle,
): string {
  const petalY = format(-radius * 0.58)
  const radiusX = format(radius * 0.48)
  const radiusY = format(radius * 0.74)
  const petals = [0, 90, 180, 270]
    .map((rotation) =>
      `<ellipse cx="0" cy="${petalY}" rx="${radiusX}" ry="${radiusY}" ` +
      `transform="rotate(${rotation})"/>`,
    )
    .join('')
  return `<g data-tip="blossom" transform="translate(${format(x)} ${format(y)})" ` +
    `fill="${style.palette.accent}">${petals}</g>`
}

function createLeafMark(
  x: number,
  y: number,
  radius: number,
  style: RenderStyle,
): string {
  return `<circle data-tip="leaf" cx="${format(x)}" cy="${format(y)}" ` +
    `r="${format(radius)}" fill="${style.palette.accent}"/>`
}

function createFallingLeafMark(
  x: number,
  y: number,
  radius: number,
  style: RenderStyle,
): string {
  return `<ellipse data-tip="falling-leaf" cx="${format(x)}" cy="${format(y)}" ` +
    `rx="${format(radius * 0.68)}" ry="${format(radius * 1.18)}" ` +
    `transform="rotate(45 ${format(x)} ${format(y)})" ` +
    `fill="${style.palette.accent}"/>`
}

function createFrostMark(
  x: number,
  y: number,
  radius: number,
  style: RenderStyle,
): string {
  const line = `M${format(-radius)} 0L${format(radius)} 0`
  const width = format(Math.max(0.1, radius * 0.24))
  return `<g data-tip="frost" transform="translate(${format(x)} ${format(y)})" ` +
    `fill="none" stroke="${style.palette.accent}" stroke-width="${width}" ` +
    `stroke-linecap="round"><path d="${line}"/>` +
    `<path d="${line}" transform="rotate(60)"/>` +
    `<path d="${line}" transform="rotate(120)"/></g>`
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
