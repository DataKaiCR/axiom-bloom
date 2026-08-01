import { describe, expect, it } from 'vitest'
import { createDefaultViewport } from './viewport'
import type { ArtworkState } from './engine/artwork-state'
import {
  MAX_SAVED_SPECIMENS,
  MAX_SPECIMEN_LIBRARY_LENGTH,
  createSavedSpecimen,
  decodeSavedSpecimen,
  parseSpecimenLibrary,
  serializeSpecimenLibrary,
  validateSpecimenName,
  type SavedSpecimen,
} from './specimen-library'

const artwork: ArtworkState = {
  presetId: 'verdant-bloom',
  axiom: 'F',
  rules: [
    { symbol: 'X', replacement: 'F+[[X]-X]-F[-FX]+X' },
    { symbol: 'F', replacement: 'F+F' },
  ],
  generations: 4,
  angle: 33.5,
  turnJitter: 4.5,
  wind: -0.25,
  gravity: 0.45,
  seed: 'library-moss',
  palette: { root: '#112233', crown: '#44aa66', accent: '#ffe080' },
  trunkWidth: 4.2,
  taper: 0.82,
  glow: 11,
  showTips: false,
  viewport: createDefaultViewport(),
}

describe('saved specimen library', () => {
  it('normalizes names and round-trips a saved artwork', () => {
    const created = createSavedSpecimen(
      {
        id: 'specimen_0001',
        name: '  Moss   Study  ',
        savedAt: 1234,
        artwork,
      },
      [],
    )

    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.value.name).toBe('Moss Study')

    const parsed = parseSpecimenLibrary(serializeSpecimenLibrary([created.value]))
    expect(parsed).toEqual({ specimens: [created.value], discarded: 0, issue: 'none' })
    expect(decodeSavedSpecimen(created.value)).toEqual({ ok: true, value: artwork })
  })

  it('rejects invalid and duplicate names', () => {
    expect(validateSpecimenName('   ').message).toBe('Enter a name for this specimen.')
    expect(validateSpecimenName('bad\nname').message).toBe(
      'Control characters are not supported.',
    )
    expect(validateSpecimenName('a'.repeat(41)).valid).toBe(false)

    const first = createSpecimen('specimen_0001', 'Moss Study')
    expect(first.ok).toBe(true)
    if (!first.ok) return

    expect(
      createSavedSpecimen(
        {
          id: 'specimen_0002',
          name: 'moss study',
          savedAt: 1235,
          artwork,
        },
        [first.value],
      ),
    ).toEqual({ ok: false, reason: 'duplicate-name' })
  })

  it('rejects invalid metadata and artwork snapshots', () => {
    expect(
      createSavedSpecimen(
        { id: 'bad', name: 'Study', savedAt: 1234, artwork },
        [],
      ),
    ).toEqual({ ok: false, reason: 'invalid-metadata' })

    expect(
      createSavedSpecimen(
        {
          id: 'specimen_0001',
          name: 'Study',
          savedAt: 1234,
          artwork: { ...artwork, viewport: { ...artwork.viewport, zoom: 99 } },
        },
        [],
      ),
    ).toEqual({ ok: false, reason: 'invalid-artwork' })

    const longReplacement = 'F'.repeat(4_096)
    expect(
      createSavedSpecimen(
        {
          id: 'specimen_0001',
          name: 'Study',
          savedAt: 1234,
          artwork: {
            ...artwork,
            rules: [
              { symbol: 'F', replacement: longReplacement },
              { symbol: 'G', replacement: longReplacement },
            ],
          },
        },
        [],
      ),
    ).toEqual({ ok: false, reason: 'artwork-too-large' })
  })

  it('enforces the saved specimen limit', () => {
    const existing: SavedSpecimen[] = Array.from(
      { length: MAX_SAVED_SPECIMENS },
      (_, index) => ({
        id: `specimen_${index.toString().padStart(4, '0')}`,
        name: `Study ${index}`,
        savedAt: index,
        payload: 'payload',
        presetId: 'verdant-bloom',
        generations: 4,
      }),
    )

    expect(
      createSavedSpecimen(
        {
          id: 'specimen_9999',
          name: 'One too many',
          savedAt: 9999,
          artwork,
        },
        existing,
      ),
    ).toEqual({ ok: false, reason: 'limit-reached' })
  })

  it('salvages valid records while discarding corrupt and duplicate entries', () => {
    const first = createSpecimen('specimen_0001', 'Moss Study')
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const stored = {
      v: 1,
      items: [
        {
          i: first.value.id,
          n: first.value.name,
          t: first.value.savedAt,
          a: first.value.payload,
        },
        { i: 'specimen_0002', n: 'Broken', t: 1235, a: 'not-valid' },
        {
          i: first.value.id,
          n: 'Duplicate',
          t: 1236,
          a: first.value.payload,
        },
      ],
    }

    expect(parseSpecimenLibrary(JSON.stringify(stored))).toEqual({
      specimens: [first.value],
      discarded: 2,
      issue: 'none',
    })
  })

  it('fails closed for malformed, oversized, and unsupported libraries', () => {
    expect(parseSpecimenLibrary('{bad json').issue).toBe('malformed')
    expect(parseSpecimenLibrary(JSON.stringify({ v: 2, items: [] })).issue).toBe(
      'unsupported-version',
    )
    expect(parseSpecimenLibrary('x'.repeat(MAX_SPECIMEN_LIBRARY_LENGTH + 1)).issue).toBe(
      'too-large',
    )
  })
})

function createSpecimen(id: string, name: string) {
  return createSavedSpecimen({ id, name, savedAt: 1234, artwork }, [])
}
