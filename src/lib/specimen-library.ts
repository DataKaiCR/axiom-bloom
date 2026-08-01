import {
  decodeArtworkState,
  encodeArtworkState,
  type ArtworkState,
  type ArtworkStateCodecResult,
} from './engine/artwork-state'

export const SPECIMEN_LIBRARY_STORAGE_KEY = 'axiom-bloom:specimens:v1'
export const SPECIMEN_LIBRARY_VERSION = 1
export const MAX_SAVED_SPECIMENS = 24
export const MAX_SPECIMEN_NAME_LENGTH = 40
export const MAX_SPECIMEN_LIBRARY_LENGTH = 240_000

export interface SavedSpecimen {
  id: string
  name: string
  savedAt: number
  payload: string
  presetId: string
  generations: number
}

export interface SpecimenNameValidation {
  valid: boolean
  value: string
  message: string
}

export type CreateSpecimenFailureReason =
  | 'artwork-too-large'
  | 'duplicate-name'
  | 'invalid-artwork'
  | 'invalid-metadata'
  | 'invalid-name'
  | 'limit-reached'

export type CreateSpecimenResult =
  | { ok: true; value: SavedSpecimen }
  | { ok: false; reason: CreateSpecimenFailureReason }

export interface SpecimenLibraryParseResult {
  specimens: SavedSpecimen[]
  discarded: number
  issue: 'none' | 'malformed' | 'too-large' | 'unsupported-version'
}

interface StoredSpecimen {
  i: string
  n: string
  t: number
  a: string
}

const SPECIMEN_ID = /^[A-Za-z0-9_-]{8,64}$/
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export function validateSpecimenName(name: string): SpecimenNameValidation {
  const value = name.trim().replace(/\s+/g, ' ')

  if (value.length === 0) {
    return { valid: false, value, message: 'Enter a name for this specimen.' }
  }
  if (CONTROL_CHARACTER.test(name)) {
    return { valid: false, value, message: 'Control characters are not supported.' }
  }
  if ([...value].length > MAX_SPECIMEN_NAME_LENGTH) {
    return {
      valid: false,
      value,
      message: `Keep names under ${MAX_SPECIMEN_NAME_LENGTH} characters.`,
    }
  }

  return { valid: true, value, message: '' }
}

export function createSavedSpecimen(
  input: {
    id: string
    name: string
    savedAt: number
    artwork: ArtworkState
  },
  existing: readonly SavedSpecimen[],
): CreateSpecimenResult {
  const name = validateSpecimenName(input.name)
  if (!name.valid) return { ok: false, reason: 'invalid-name' }
  if (existing.length >= MAX_SAVED_SPECIMENS) {
    return { ok: false, reason: 'limit-reached' }
  }
  if (
    !SPECIMEN_ID.test(input.id) ||
    !Number.isFinite(input.savedAt) ||
    input.savedAt < 0
  ) {
    return { ok: false, reason: 'invalid-metadata' }
  }
  if (
    existing.some(
      (specimen) => specimen.name.toLowerCase() === name.value.toLowerCase(),
    )
  ) {
    return { ok: false, reason: 'duplicate-name' }
  }

  const encoded = encodeArtworkState(input.artwork)
  if (!encoded.ok) {
    return {
      ok: false,
      reason: encoded.reason === 'too-large' ? 'artwork-too-large' : 'invalid-artwork',
    }
  }

  return {
    ok: true,
    value: {
      id: input.id,
      name: name.value,
      savedAt: input.savedAt,
      payload: encoded.value,
      presetId: input.artwork.presetId,
      generations: input.artwork.generations,
    },
  }
}

export function serializeSpecimenLibrary(
  specimens: readonly SavedSpecimen[],
): string {
  const items: StoredSpecimen[] = specimens
    .slice(0, MAX_SAVED_SPECIMENS)
    .map((specimen) => ({
      i: specimen.id,
      n: specimen.name,
      t: specimen.savedAt,
      a: specimen.payload,
    }))

  return JSON.stringify({ v: SPECIMEN_LIBRARY_VERSION, items })
}

export function parseSpecimenLibrary(
  value: string | null,
): SpecimenLibraryParseResult {
  if (value === null) return { specimens: [], discarded: 0, issue: 'none' }
  if (value.length > MAX_SPECIMEN_LIBRARY_LENGTH) {
    return { specimens: [], discarded: 0, issue: 'too-large' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return { specimens: [], discarded: 0, issue: 'malformed' }
  }

  if (!isRecord(parsed)) {
    return { specimens: [], discarded: 0, issue: 'malformed' }
  }
  if (
    typeof parsed.v === 'number' &&
    parsed.v !== SPECIMEN_LIBRARY_VERSION
  ) {
    return { specimens: [], discarded: 0, issue: 'unsupported-version' }
  }
  if (parsed.v !== SPECIMEN_LIBRARY_VERSION || !Array.isArray(parsed.items)) {
    return { specimens: [], discarded: 0, issue: 'malformed' }
  }

  const specimens: SavedSpecimen[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  let discarded = 0

  for (let index = 0; index < parsed.items.length; index += 1) {
    if (specimens.length >= MAX_SAVED_SPECIMENS) {
      discarded += parsed.items.length - index
      break
    }

    const record = parseStoredSpecimen(parsed.items[index])
    if (!record) {
      discarded += 1
      continue
    }

    const normalizedName = record.name.toLowerCase()
    if (ids.has(record.id) || names.has(normalizedName)) {
      discarded += 1
      continue
    }

    const artwork = decodeArtworkState(record.payload)
    if (!artwork.ok) {
      discarded += 1
      continue
    }

    ids.add(record.id)
    names.add(normalizedName)
    specimens.push({
      ...record,
      presetId: artwork.value.presetId,
      generations: artwork.value.generations,
    })
  }

  return { specimens, discarded, issue: 'none' }
}

export function decodeSavedSpecimen(
  specimen: SavedSpecimen,
): ArtworkStateCodecResult<ArtworkState> {
  return decodeArtworkState(specimen.payload)
}

function parseStoredSpecimen(value: unknown): Omit<SavedSpecimen, 'presetId' | 'generations'> | null {
  if (!isRecord(value)) return null

  const name = typeof value.n === 'string'
    ? validateSpecimenName(value.n)
    : null

  if (
    typeof value.i !== 'string' ||
    !SPECIMEN_ID.test(value.i) ||
    !name?.valid ||
    typeof value.t !== 'number' ||
    !Number.isFinite(value.t) ||
    value.t < 0 ||
    typeof value.a !== 'string'
  ) {
    return null
  }

  return {
    id: value.i,
    name: name.value,
    savedAt: value.t,
    payload: value.a,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
