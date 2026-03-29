<script lang="ts">
  import { Pcset, Scale } from 'tonal';
  import { ALL_SCALES } from '$lib/scales';
  import { filterScales, groupByKeyOverlap, countKeyOverlap } from '$lib/filter';
  import type { OverlapGroup } from '$lib/filter';
  import ScaleDiagram from '$lib/ScaleDiagram.svelte';

  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const ALL_MAJOR_MODES = Scale.modeNames('major').map(m => m[1]);
  const HARMONIC_MINOR_MODES = Scale.modeNames('harmonic minor').map(m => m[1]);
  const MELODIC_MINOR_MODES = Scale.modeNames('melodic minor').map(m => m[1]);

  // "Something Else" dropdown: other major modes (not "major" or "minor"), then harmonic/melodic minor
  const OTHER_MAJOR_MODES = ALL_MAJOR_MODES.filter(m => m !== 'major' && m !== 'minor');
  const SOMETHING_ELSE_MODES = [...OTHER_MAJOR_MODES, ...HARMONIC_MINOR_MODES, ...MELODIC_MINOR_MODES];
  const isSomethingElse = (q: string | null) => q !== null && q !== 'major' && q !== 'minor';

  // --- Target Notes state ---
  let selectedNotes = $state<Set<string>>(new Set());

  let filteredScales = $derived(filterScales(ALL_SCALES, [...selectedNotes]));

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

  // --- Key state ---
  let selectedRoot = $state<string | null>(null);
  let selectedQuality = $state<string | null>(null);

  let selectedKey = $derived.by(() => {
    if (!selectedRoot || !selectedQuality) return null;
    const scale = Scale.get(selectedRoot + ' ' + selectedQuality);
    if (!scale.notes.length) return null;
    return {
      name: selectedRoot + ' ' + selectedQuality,
      notes: scale.notes,
      chroma: Pcset.chroma(scale.notes),
    };
  });

  function selectRoot(root: string) {
    selectedRoot = selectedRoot === root ? null : root;
  }

  function selectQuality(quality: string) {
    selectedQuality = selectedQuality === quality ? null : quality;
  }

  function clearKey() {
    selectedRoot = null;
    selectedQuality = null;
  }

  // --- Grouping ---
  let groupedByType = $derived({
    maj6: filteredScales.filter(s => s.type === 'maj6'),
    min6: filteredScales.filter(s => s.type === 'min6'),
    dom7: filteredScales.filter(s => s.type === 'dom7'),
    dom7b5: filteredScales.filter(s => s.type === 'dom7b5'),
    octatonic: filteredScales.filter(s => s.type === 'octatonic'),
  });

  const TYPE_LABELS: Record<string, string> = {
    maj6: 'Maj6 Diminished',
    min6: 'Min6 Diminished',
    dom7: 'Dom7 Diminished',
    dom7b5: 'Dom7b5 Diminished',
    octatonic: 'Octatonic',
  };

  let overlapGroups = $derived<OverlapGroup[]>(
    selectedKey ? groupByKeyOverlap(filteredScales, selectedKey.chroma) : []
  );

  // --- Diagram saturation ---
  let scaleSaturations = $derived.by(() => {
    const filteredSet = new Set(filteredScales.map(s => s.name));
    const map = new Map<string, number>();
    for (const scale of ALL_SCALES) {
      if (!filteredSet.has(scale.name)) {
        map.set(scale.name, 0);
      } else if (selectedKey) {
        const overlap = countKeyOverlap(selectedKey.chroma, scale.chroma);
        map.set(scale.name, overlap / selectedKey.notes.length);
      } else {
        map.set(scale.name, 1);
      }
    }
    return map;
  });

  // --- Key note dim7 group colors ---
  const KEY_COLORS: Record<string, string> = {
    'C': 'rgb(240, 154, 65)', 'Eb': 'rgb(240, 154, 65)', 'Gb': 'rgb(240, 154, 65)', 'A': 'rgb(240, 154, 65)',
    'Db': 'rgb(119, 65, 240)', 'E': 'rgb(119, 65, 240)', 'G': 'rgb(119, 65, 240)', 'Bb': 'rgb(119, 65, 240)',
    'F': 'rgb(41, 240, 67)', 'B': 'rgb(41, 240, 67)', 'D': 'rgb(41, 240, 67)', 'Ab': 'rgb(41, 240, 67)',
  };

  let selectedRootColor = $derived(selectedRoot ? KEY_COLORS[selectedRoot] : null);

  // --- Target note dim7 group colors ---
  const DIM7_COLORS: Record<string, string> = {
    'C': 'rgb(239, 227, 65)', 'Eb': 'rgb(239, 227, 65)', 'Gb': 'rgb(239, 227, 65)', 'A': 'rgb(239, 227, 65)',
    'G': 'rgb(240, 41, 93)', 'E': 'rgb(240, 41, 93)', 'Bb': 'rgb(240, 41, 93)', 'Db': 'rgb(240, 41, 93)',
    'B': 'rgb(86, 180, 233)', 'D': 'rgb(86, 180, 233)', 'F': 'rgb(86, 180, 233)', 'Ab': 'rgb(86, 180, 233)',
  };

  // --- Note highlighting ---
  let selectedChroma = $derived(
    selectedNotes.size > 0 ? Pcset.chroma([...selectedNotes]) : null
  );

  function isTargetNote(note: string): boolean {
    if (!selectedChroma) return false;
    const noteChroma = Pcset.chroma([note]);
    for (let i = 0; i < 12; i++) {
      if (noteChroma[i] === '1' && selectedChroma[i] === '1') return true;
    }
    return false;
  }

  function isKeyNote(note: string): boolean {
    if (!selectedKey) return false;
    const noteChroma = Pcset.chroma([note]);
    for (let i = 0; i < 12; i++) {
      if (noteChroma[i] === '1' && selectedKey.chroma[i] === '1') return true;
    }
    return false;
  }
</script>

<main class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="h1 mb-1">Harritonic Scales</h1>
  <p class="text-sm text-surface-500 mb-6">Pick a scale for a chord from outside the key</p>

  <!-- Key Selector -->
  <div class="mb-6">
    <h2 class="text-sm font-semibold text-surface-500 tracking-wide mb-2">Key: If you are in the key of...</h2>
    <div class="flex flex-wrap gap-2 mb-3">
      {#each NOTE_NAMES as note}
        <button
          class="chip font-mono {selectedRoot === note
            ? ''
            : 'preset-outlined-surface-500'}"
          style={selectedRoot === note
            ? `background-color: ${KEY_COLORS[note]}; color: var(--color-surface-950);`
            : ''}
          onclick={() => selectRoot(note)}
        >
          {note}
        </button>
      {/each}
      <button
        class="btn btn-sm preset-tonal-surface"
        onclick={clearKey}
      >
        Clear
      </button>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      <button
        class="chip {selectedQuality === 'major'
          ? ''
          : 'preset-outlined-surface-500'}"
        style={selectedQuality === 'major'
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onclick={() => selectQuality('major')}
      >
        Major
      </button>
      <button
        class="chip {selectedQuality === 'minor'
          ? ''
          : 'preset-outlined-surface-500'}"
        style={selectedQuality === 'minor'
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onclick={() => selectQuality('minor')}
      >
        Natural Minor
      </button>
      <select
        class="select text-sm max-w-48"
        style={isSomethingElse(selectedQuality)
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onchange={(e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val) selectQuality(val); else selectedQuality = null;
        }}
        value={isSomethingElse(selectedQuality) ? selectedQuality : ''}
      >
        <option value="">Something Else...</option>
        <optgroup label="Major Modes">
          {#each OTHER_MAJOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
        <optgroup label="Harmonic Minor">
          {#each HARMONIC_MINOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
        <optgroup label="Melodic Minor">
          {#each MELODIC_MINOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
      </select>
    </div>
    {#if selectedKey}
      <p class="text-sm text-surface-500">
        Key: {selectedKey.name} — {selectedKey.notes.join(', ')}
      </p>
    {/if}
  </div>

  <!-- Target Notes -->
  <div class="mb-6">
    <h2 class="text-sm font-semibold text-surface-500 tracking-wide mb-2">Target Notes: And you are playing a chord with these notes...</h2>
    <div class="flex flex-wrap gap-2 mb-3">
      {#each NOTE_NAMES as note}
        <button
          class="chip font-mono {selectedNotes.has(note)
            ? ''
            : 'preset-outlined-surface-500'}"
          style={selectedNotes.has(note)
            ? `background-color: ${DIM7_COLORS[note]}; color: var(--color-surface-950);`
            : ''}
          onclick={() => toggleNote(note)}
        >
          {note}
        </button>
      {/each}
      <button
        class="btn btn-sm preset-tonal-surface"
        onclick={clearSelection}
      >
        Clear
      </button>
    </div>
  </div>

  <!-- Results Count -->
  <p class="text-sm text-surface-500 mb-4">
    Showing {filteredScales.length} of {ALL_SCALES.length} scales
  </p>

  <!-- Scale Diagram -->
  <div class="mb-6">
    <ScaleDiagram {scaleSaturations} />
  </div>

  <p class="text-sm text-surface-500 mb-4">You could use the following scales, sorted by how consonant they are</p>

  <!-- Scale List: grouped by overlap when key active, by type otherwise -->
  {#if selectedKey}
    {#each overlapGroups as group}
      <section class="mb-6">
        <h2 class="h4 mb-2">
          {group.overlap} of {selectedKey.notes.length} key notes
        </h2>
        <div class="space-y-2">
          {#each group.scales as scale}
            <div class="card preset-outlined-surface-200-800 p-3">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-medium">{scale.name}</span>
                <span class="text-xs text-surface-400">{group.overlap}/{selectedKey.notes.length}</span>
              </div>
              <div class="flex gap-1.5 flex-wrap">
                {#each Pcset.notes(scale.chroma) as note}
                  <span
                    class="px-1.5 py-0.5 rounded text-sm font-mono"
                    class:font-bold={isKeyNote(note)}
                    class:underline={isTargetNote(note)}
                    class:decoration-2={isTargetNote(note)}
                    class:underline-offset-2={isTargetNote(note)}
                  >
                    {note}
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    {#each Object.entries(groupedByType) as [type, scales]}
      {#if scales.length > 0}
        <section class="mb-6">
          <h2 class="h4 mb-2">{TYPE_LABELS[type]}</h2>
          <div class="space-y-2">
            {#each scales as scale}
              <div class="card preset-outlined-surface-200-800 p-3">
                <div class="font-medium mb-1">{scale.name}</div>
                <div class="flex gap-1.5 flex-wrap">
                  {#each Pcset.notes(scale.chroma) as note}
                    <span
                      class="px-1.5 py-0.5 rounded text-sm font-mono"
                      class:underline={isTargetNote(note)}
                      class:decoration-2={isTargetNote(note)}
                      class:underline-offset-2={isTargetNote(note)}
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
  {/if}
</main>
