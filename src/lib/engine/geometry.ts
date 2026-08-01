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

const WIND_TROPISM = 0.018
const GRAVITY_TROPISM = 0.014

interface TurtleState {
  x: number
  y: number
  heading: number
  depth: number
  segmentIndex: number
}

type InterpreterSettings = Pick<
  GenerationSettings,
  'angle' | 'turnJitter' | 'wind' | 'gravity' | 'seed'
>

interface InterpreterContext {
  preset: LSystemPreset
  settings: InterpreterSettings
  drawSymbols: Set<string>
  moveSymbols: Set<string>
  random: () => number
}

interface InterpreterState {
  x: number
  y: number
  heading: number
  depth: number
  maxDepth: number
  segments: number[]
  tips: number[]
  stack: TurtleState[]
  bounds: Bounds
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
  settings: InterpreterSettings,
): Geometry {
  const context: InterpreterContext = {
    preset,
    settings,
    drawSymbols: new Set(preset.drawSymbols),
    moveSymbols: new Set(preset.moveSymbols ?? []),
    random: createRandom(settings.seed),
  }
  const state = createInterpreterState(preset.startAngle)

  for (const command of commands) {
    executeCommand(command, state, context)
  }

  return finishGeometry(commands.length, state)
}

function createInterpreterState(startAngle: number): InterpreterState {
  return {
    x: 0,
    y: 0,
    heading: degreesToRadians(startAngle),
    depth: 0,
    maxDepth: 0,
    segments: [],
    tips: [],
    stack: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  }
}

function executeCommand(
  command: string,
  state: InterpreterState,
  context: InterpreterContext,
): void {
  if (context.drawSymbols.has(command)) {
    advanceTurtle(state, context, true)
    return
  }
  if (context.moveSymbols.has(command)) {
    advanceTurtle(state, context, false)
    return
  }

  switch (command) {
    case '+':
      turnTurtle(state, context, 1)
      break
    case '-':
      turnTurtle(state, context, -1)
      break
    case '[':
      openBranch(state)
      break
    case ']':
      closeBranch(state)
      break
  }
}

function turnTurtle(
  state: InterpreterState,
  context: InterpreterContext,
  direction: -1 | 1,
): void {
  state.heading += direction * turnAngle(
    context.settings.angle,
    context.settings.turnJitter,
    context.random(),
  )
}

function advanceTurtle(
  state: InterpreterState,
  context: InterpreterContext,
  draw: boolean,
): void {
  const nextX = state.x + Math.cos(state.heading) * context.preset.step
  const nextY = state.y + Math.sin(state.heading) * context.preset.step

  if (draw) {
    state.segments.push(state.x, state.y, nextX, nextY, state.depth)
    updateBounds(state.bounds, nextX, nextY)
  }

  state.x = nextX
  state.y = nextY
  applyTropism(state, context.settings)
}

function applyTropism(
  state: InterpreterState,
  settings: InterpreterSettings,
): void {
  const windTurn = -Math.sin(state.heading) * settings.wind * WIND_TROPISM
  const gravityTurn = Math.cos(state.heading) * settings.gravity * GRAVITY_TROPISM
  state.heading += windTurn + gravityTurn
}

function updateBounds(bounds: Bounds, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x)
  bounds.minY = Math.min(bounds.minY, y)
  bounds.maxX = Math.max(bounds.maxX, x)
  bounds.maxY = Math.max(bounds.maxY, y)
}

function openBranch(state: InterpreterState): void {
  state.stack.push({
    x: state.x,
    y: state.y,
    heading: state.heading,
    depth: state.depth,
    segmentIndex: state.segments.length / SEGMENT_STRIDE,
  })
  state.depth += 1
  state.maxDepth = Math.max(state.maxDepth, state.depth)
}

function closeBranch(state: InterpreterState): void {
  const previous = state.stack.pop()
  if (!previous) {
    throw new SyntaxError('The L-system contains an unmatched closing bracket.')
  }

  const segmentIndex = state.segments.length / SEGMENT_STRIDE
  if (segmentIndex > previous.segmentIndex) {
    state.tips.push(state.x, state.y, state.depth, segmentIndex)
  }

  state.x = previous.x
  state.y = previous.y
  state.heading = previous.heading
  state.depth = previous.depth
}

function finishGeometry(commandCount: number, state: InterpreterState): Geometry {
  if (state.stack.length > 0) {
    throw new SyntaxError('The L-system contains an unmatched opening bracket.')
  }
  if (state.segments.length > 0) {
    state.tips.push(
      state.x,
      state.y,
      state.depth,
      state.segments.length / SEGMENT_STRIDE,
    )
  }

  return {
    segments: new Float32Array(state.segments),
    tips: new Float32Array(state.tips),
    bounds: state.bounds,
    maxDepth: state.maxDepth,
    commandCount,
    segmentCount: state.segments.length / SEGMENT_STRIDE,
  }
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function turnAngle(angle: number, jitter: number, randomValue: number): number {
  const variedAngle = angle + (randomValue * 2 - 1) * jitter
  return degreesToRadians(variedAngle)
}
