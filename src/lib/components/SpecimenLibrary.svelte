<script lang="ts">
  import { onMount } from 'svelte'
  import type { ArtworkState } from '../engine/artwork-state'
  import { getPreset } from '../engine/presets'
  import {
    MAX_SAVED_SPECIMENS,
    MAX_SPECIMEN_NAME_LENGTH,
    SPECIMEN_LIBRARY_STORAGE_KEY,
    createSavedSpecimen,
    decodeSavedSpecimen,
    parseSpecimenLibrary,
    serializeSpecimenLibrary,
    validateSpecimenName,
    type CreateSpecimenFailureReason,
    type SavedSpecimen,
  } from '../specimen-library'

  interface Props {
    artwork: ArtworkState
    grammarValid: boolean
    onOpen: (artwork: ArtworkState) => void
  }

  interface Feedback {
    tone: 'success' | 'error'
    message: string
  }

  let { artwork, grammarValid, onOpen }: Props = $props()

  let specimens = $state<SavedSpecimen[]>([])
  let specimenName = $state('')
  let nameTouched = $state(false)
  let feedback = $state<Feedback | null>(null)
  let nameValidation = $derived(validateSpecimenName(specimenName))

  onMount(() => restoreLibrary())

  function restoreLibrary(): void {
    let stored: string | null
    try {
      stored = window.localStorage.getItem(SPECIMEN_LIBRARY_STORAGE_KEY)
    } catch {
      feedback = {
        tone: 'error',
        message: 'Local specimen storage is unavailable in this browser.',
      }
      return
    }

    const restored = parseSpecimenLibrary(stored)
    specimens = restored.specimens

    if (restored.issue !== 'none') {
      feedback = {
        tone: 'error',
        message: 'The saved specimen library could not be restored safely.',
      }
    } else if (restored.discarded > 0) {
      feedback = {
        tone: 'error',
        message: `${restored.discarded} invalid saved ${restored.discarded === 1 ? 'specimen was' : 'specimens were'} skipped.`,
      }
    }
  }

  function saveSpecimen(event: SubmitEvent): void {
    event.preventDefault()
    nameTouched = true

    if (!grammarValid) {
      feedback = {
        tone: 'error',
        message: 'Fix the grammar before saving this specimen.',
      }
      return
    }

    const created = createSavedSpecimen(
      {
        id: crypto.randomUUID(),
        name: specimenName,
        savedAt: Date.now(),
        artwork,
      },
      specimens,
    )

    if (!created.ok) {
      feedback = { tone: 'error', message: saveError(created.reason) }
      return
    }

    if (!persistLibrary([created.value, ...specimens])) return

    specimenName = ''
    nameTouched = false
    feedback = {
      tone: 'success',
      message: `${created.value.name} was saved locally.`,
    }
  }

  function openSpecimen(specimen: SavedSpecimen): void {
    const decoded = decodeSavedSpecimen(specimen)
    if (!decoded.ok) {
      feedback = {
        tone: 'error',
        message: `${specimen.name} could not be restored safely.`,
      }
      return
    }

    onOpen(decoded.value)
    specimenName = ''
    nameTouched = false
    feedback = {
      tone: 'success',
      message: `${specimen.name} is now open.`,
    }
  }

  function deleteSpecimen(specimen: SavedSpecimen): void {
    if (!window.confirm(`Delete “${specimen.name}” from this browser?`)) return

    const next = specimens.filter((candidate) => candidate.id !== specimen.id)
    if (!persistLibrary(next)) return

    feedback = {
      tone: 'success',
      message: `${specimen.name} was deleted.`,
    }
  }

  function persistLibrary(next: SavedSpecimen[]): boolean {
    try {
      window.localStorage.setItem(
        SPECIMEN_LIBRARY_STORAGE_KEY,
        serializeSpecimenLibrary(next),
      )
      specimens = next
      return true
    } catch {
      feedback = {
        tone: 'error',
        message: 'This browser could not save the specimen library.',
      }
      return false
    }
  }

  function saveError(reason: CreateSpecimenFailureReason): string {
    if (reason === 'duplicate-name') return 'Choose a unique specimen name.'
    if (reason === 'limit-reached') {
      return `Delete a saved specimen before adding more than ${MAX_SAVED_SPECIMENS}.`
    }
    if (reason === 'artwork-too-large') {
      return 'This artwork is too complex to store as a local specimen.'
    }
    if (reason === 'invalid-name') return nameValidation.message
    return 'This artwork could not be saved safely.'
  }
</script>

<section class="control-section specimen-library-section">
  <div class="section-heading">
    <span>Local library</span>
    <small>{specimens.length} / {MAX_SAVED_SPECIMENS}</small>
  </div>

  <form class="specimen-save-form" onsubmit={saveSpecimen}>
    <label>
      <span class="sr-only">Specimen name</span>
      <input
        type="text"
        bind:value={specimenName}
        maxlength={MAX_SPECIMEN_NAME_LENGTH}
        placeholder="Name this specimen"
        aria-label="Specimen name"
        aria-invalid={nameTouched && !nameValidation.valid}
        aria-describedby={nameTouched && !nameValidation.valid
          ? 'specimen-name-error'
          : undefined}
        oninput={() => {
          nameTouched = true
          feedback = null
        }}
      />
    </label>
    <button
      type="submit"
      disabled={!grammarValid || specimens.length >= MAX_SAVED_SPECIMENS}
    >
      Save
    </button>
  </form>

  {#if nameTouched && !nameValidation.valid}
    <p class="specimen-message error" id="specimen-name-error">
      {nameValidation.message}
    </p>
  {:else if specimens.length >= MAX_SAVED_SPECIMENS}
    <p class="specimen-message error">
      Delete a saved specimen before adding another.
    </p>
  {:else if feedback}
    <p
      class="specimen-message"
      class:error={feedback.tone === 'error'}
      role="status"
      aria-live="polite"
    >
      {feedback.message}
    </p>
  {/if}

  {#if specimens.length === 0}
    <p class="specimen-empty">Saved artworks stay in this browser.</p>
  {:else}
    <div class="specimen-list">
      {#each specimens as specimen (specimen.id)}
        <div class="specimen-card">
          <button
            class="specimen-open-button"
            type="button"
            onclick={() => openSpecimen(specimen)}
            aria-label={`Open saved specimen ${specimen.name}`}
          >
            <strong>{specimen.name}</strong>
            <small>
              {getPreset(specimen.presetId).name} · {specimen.generations}
              {specimen.generations === 1 ? 'generation' : 'generations'}
            </small>
          </button>
          <button
            class="specimen-delete-button"
            type="button"
            onclick={() => deleteSpecimen(specimen)}
            aria-label={`Delete saved specimen ${specimen.name}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</section>
