import { describe, expect, it } from 'vitest'
import type { Geometry } from '../engine/types'
import { createSvg } from './svg'
import type { RenderStyle } from './canvas'

const geometry: Geometry = {
  segments: new Float32Array([
    0, 0, 10, -10, 0,
    10, -10, 20, -5, 1,
  ]),
  tips: new Float32Array([20, -5, 1, 2]),
  bounds: { minX: 0, minY: -10, maxX: 20, maxY: 0 },
  maxDepth: 1,
  commandCount: 2,
  segmentCount: 2,
}

const style: RenderStyle = {
  palette: { root: '#112233', crown: '#44aa66', accent: '#ffe080' },
  background: '#050807',
  trunkWidth: 3,
  taper: 0.8,
  glow: 4,
  showTips: true,
}

describe('createSvg', () => {
  it('exports grouped paths, visible tips, and escaped metadata', () => {
    const svg = createSvg(geometry, style, 'Tree <Study> & Notes')

    expect(svg).toContain('<title>Tree &lt;Study&gt; &amp; Notes</title>')
    expect(svg.match(/<path /g)).toHaveLength(2)
    expect(svg).toContain('<circle cx="20" cy="-5"')
    expect(svg).not.toContain('NaN')
  })

  it('omits tip markup when tips are hidden', () => {
    const svg = createSvg(geometry, { ...style, showTips: false }, 'Tree')

    expect(svg).not.toContain('<circle')
  })
})
