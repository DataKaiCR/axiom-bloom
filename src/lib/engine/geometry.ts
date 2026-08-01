import { expandLSystem } from './expand'
import { createRandom } from './random'
import {
  SEGMENT_STRIDE,
  TIP_STRIDE,
  type Bounds,
  type GenerationSettings,
  type Geometry,
  type LSystemPreset,
} from './types'

interface TurtleState {
  x: number
  y: number
  heading: number
  depth: number
  segmentIndex: number
}

export function generateGeometry(
  preset: LSystemPreset,
  settings: GenerationSettings,
): Geometry {
  const commands = expandLSystem(
    preset.axiom,
    preset.rules,
    settings.generations,
    settings.maxSymbols,
  )

  return interpretCommands(commands, preset, settings)
}

export function interpretCommands(
  commands: string,
  preset: LSystemPreset,
  settings: Pick<GenerationSettings, 'angle' | 'turnJitter' | 'seed'>,
): Geometry {
  const drawSymbols = new Set(preset.drawSymbols)
  const moveSymbols = new Set(preset.moveSymbols ?? [])
  const random = createRandom(settings.seed)
  const segments: number[] = []
  const tips: number[] = []
  const stack: TurtleState[] = []
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  let x = 0
  let y = 0
  let heading = degreesToRadians(preset.startAngle)
  let depth = 0
  let maxDepth = 0

  const updateBounds = (nextX: number, nextY: number) => {
    bounds.minX = Math.min(bounds.minX, nextX)
    bounds.minY = Math.min(bounds.minY, nextY)
    bounds.maxX = Math.max(bounds.maxX, nextX)
    bounds.maxY = Math.max(bounds.maxY, nextY)
  }

  const advance = (draw: boolean) => {
    const nextX = x + Math.cos(heading) * preset.step
    const nextY = y + Math.sin(heading) * preset.step

    if (draw) {
      segments.push(x, y, nextX, nextY, depth)
      updateBounds(nextX, nextY)
    }

    x = nextX
    y = nextY
  }

  for (const command of commands) {
    if (drawSymbols.has(command)) {
      advance(true)
      continue
    }

    if (moveSymbols.has(command)) {
      advance(false)
      continue
    }

    if (command === '+') {
      heading += turnAngle(settings.angle, settings.turnJitter, random())
    } else if (command === '-') {
      heading -= turnAngle(settings.angle, settings.turnJitter, random())
    } else if (command === '[') {
      stack.push({
        x,
        y,
        heading,
        depth,
        segmentIndex: segments.length / SEGMENT_STRIDE,
      })
      depth += 1
      maxDepth = Math.max(maxDepth, depth)
    } else if (command === ']') {
      const previous = stack.pop()

      if (!previous) {
        throw new SyntaxError('The L-system contains an unmatched closing bracket.')
      }

      const segmentIndex = segments.length / SEGMENT_STRIDE
      if (segmentIndex > previous.segmentIndex) {
        tips.push(x, y, depth, segmentIndex)
      }

      ;({ x, y, heading, depth } = previous)
    }
  }

  if (stack.length > 0) {
    throw new SyntaxError('The L-system contains an unmatched opening bracket.')
  }

  if (segments.length > 0) {
    tips.push(x, y, depth, segments.length / SEGMENT_STRIDE)
  }

  return {
    segments: new Float32Array(segments),
    tips: new Float32Array(tips),
    bounds,
    maxDepth,
    commandCount: commands.length,
    segmentCount: segments.length / SEGMENT_STRIDE,
  }
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function turnAngle(angle: number, jitter: number, randomValue: number): number {
  const variedAngle = angle + (randomValue * 2 - 1) * jitter
  return degreesToRadians(variedAngle)
}
