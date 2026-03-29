<script lang="ts">
  import { Pcset } from 'tonal';
  import { ALL_SCALES } from '$lib/scales';
  import { filterScales } from '$lib/filter';
  import ScaleDiagram from '$lib/ScaleDiagram.svelte';

  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  let selectedNotes = $state<Set<string>>(new Set());

  let filteredScales = $derived(filterScales(ALL_SCALES, [...selectedNotes]));

  let groupedScales = $derived({
    maj6: filteredScales.filter(s => s.type === 'maj6'),
    min6: filteredScales.filter(s => s.type === 'min6'),
    dom7: filteredScales.filter(s => s.type === 'dom7'),
    dom7b5: filteredScales.filter(s => s.type === 'dom7b5'),
    octatonic: filteredScales.filter(s => s.type === 'octatonic'),
  });

  const GROUP_LABELS: Record<string, string> = {
    maj6: 'Maj6 Diminished',
    min6: 'Min6 Diminished',
    dom7: 'Dom7 Diminished',
    dom7b5: 'Dom7b5 Diminished',
    octatonic: 'Octatonic',
  };

  function toggleNote(note: string) {
    const next = new Set(selectedNotes);
    if (next.has(note)) {
      next.delete(note);
    } else {
      next.add(note);
    }
    selectedNotes = next;
  }

  function clearSelection() {
    selectedNotes = new Set();
  }

  let selectedChroma = $derived(
    selectedNotes.size > 0 ? Pcset.chroma([...selectedNotes]) : null
  );

  function isNoteHighlighted(note: string): boolean {
    if (!selectedChroma) return false;
    const noteChroma = Pcset.chroma([note]);
    for (let i = 0; i < 12; i++) {
      if (noteChroma[i] === '1' && selectedChroma[i] === '1') return true;
    }
    return false;
  }
</script>

<main class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Barry Harris Scale Filter</h1>

  <!-- Note Selector -->
  <div class="mb-6">
    <div class="flex flex-wrap gap-2 mb-3">
      {#each NOTE_NAMES as note}
        <button
          class="px-3 py-2 rounded font-mono text-sm border transition-colors {selectedNotes.has(note)
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'}"
          onclick={() => toggleNote(note)}
        >
          {note}
        </button>
      {/each}
      <button
        class="px-3 py-2 rounded text-sm border border-gray-300 text-gray-500 hover:border-gray-400 transition-colors"
        onclick={clearSelection}
      >
        Clear
      </button>
    </div>
    <p class="text-sm text-gray-500">
      Showing {filteredScales.length} of {ALL_SCALES.length} scales
    </p>
  </div>

  <!-- Scale Diagram -->
  <div class="mb-6">
    <ScaleDiagram filteredScaleNames={filteredScales.map(s => s.name)} />
  </div>

  <!-- Scale List -->
  {#each Object.entries(groupedScales) as [type, scales]}
    {#if scales.length > 0}
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2 text-gray-700">{GROUP_LABELS[type]}</h2>
        <div class="space-y-2">
          {#each scales as scale}
            <div class="p-3 border border-gray-200 rounded">
              <div class="font-medium mb-1">{scale.name}</div>
              <div class="flex gap-1.5 flex-wrap">
                {#each Pcset.notes(scale.chroma) as note}
                  <span
                    class="px-1.5 py-0.5 rounded text-sm font-mono {isNoteHighlighted(note)
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'text-gray-600'}"
                  >
                    {note}
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</main>
