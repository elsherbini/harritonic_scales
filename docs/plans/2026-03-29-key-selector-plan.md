# Key Selector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a key selector that sorts Barry Harris scales by overlap with a chosen 7-note key, with independent target note filtering.

**Architecture:** Add a `keyOverlap` function to `filter.ts` that counts chroma overlap between a key and a scale. Update `+page.svelte` with key selector UI (root toggle + quality grid), new state (`selectedRoot`, `selectedQuality`), and conditional grouping (by overlap count when key active, by type when not).

**Tech Stack:** tonal.js (`Scale`, `Pcset`), SvelteKit, Svelte 5 runes, Tailwind v4

---

### Task 1: Add key overlap function with tests

**Files:**
- Modify: `src/lib/filter.ts`
- Modify: `src/lib/filter.test.ts`

**Step 1: Write failing tests for `countKeyOverlap`**

Add to `src/lib/filter.test.ts`:

```ts
import { filterScales, countKeyOverlap } from './filter';
```

```ts
describe('countKeyOverlap', () => {
  it('returns 7 when key is fully contained in scale', () => {
    // C major notes: C D E F G A B — chroma 101011010101
    // C Maj6 Dim:    C D E F G Ab A B — chroma 101011011101
    // All 7 C major notes are in C Maj6 Dim
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
    expect(countKeyOverlap('101011010101', cMaj6.chroma)).toBe(7);
  });

  it('returns 0 when no overlap', () => {
    // key chroma with only C# D# F# G# A# = 010100101010
    // scale with only C D E F G Ab A B = 101011011101
    expect(countKeyOverlap('010100101010', '101011011101')).toBe(0);
  });

  it('returns correct partial overlap', () => {
    // C major: 101011010101
    // A scale with C D E but not F G A B
    // Just C E G = 100010010000
    expect(countKeyOverlap('101011010101', '100010010000')).toBe(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: FAIL — `countKeyOverlap` is not exported

**Step 3: Implement `countKeyOverlap`**

Add to `src/lib/filter.ts`:

```ts
export function countKeyOverlap(keyChroma: string, scaleChroma: string): number {
  let count = 0;
  for (let i = 0; i < 12; i++) {
    if (keyChroma[i] === '1' && scaleChroma[i] === '1') count++;
  }
  return count;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: add countKeyOverlap function"
```

---

### Task 2: Add `groupByKeyOverlap` function with tests

**Files:**
- Modify: `src/lib/filter.ts`
- Modify: `src/lib/filter.test.ts`

**Step 1: Write failing tests for `groupByKeyOverlap`**

Add to `src/lib/filter.test.ts`:

```ts
import { filterScales, countKeyOverlap, groupByKeyOverlap } from './filter';
import { Pcset, Scale } from 'tonal';
```

```ts
describe('groupByKeyOverlap', () => {
  it('groups scales by overlap count descending', () => {
    const keyChroma = Pcset.chroma(Scale.get('C major').notes);
    const groups = groupByKeyOverlap(ALL_SCALES, keyChroma);

    // groups should be an array of { overlap: number, scales: BarryHarrisScale[] }
    // sorted by overlap descending
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].overlap).toBeGreaterThanOrEqual(groups[groups.length - 1].overlap);

    // every scale should appear exactly once
    const allScales = groups.flatMap(g => g.scales);
    expect(allScales).toHaveLength(45);
  });

  it('does not include empty overlap groups', () => {
    const keyChroma = Pcset.chroma(Scale.get('C major').notes);
    const groups = groupByKeyOverlap(ALL_SCALES, keyChroma);

    for (const group of groups) {
      expect(group.scales.length).toBeGreaterThan(0);
    }
  });

  it('preserves stable order within overlap groups', () => {
    const keyChroma = Pcset.chroma(Scale.get('C major').notes);
    const groups = groupByKeyOverlap(ALL_SCALES, keyChroma);

    // Within each group, scales should appear in same relative order as ALL_SCALES
    for (const group of groups) {
      const indices = group.scales.map(s => ALL_SCALES.indexOf(s));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]);
      }
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: FAIL — `groupByKeyOverlap` is not exported

**Step 3: Implement `groupByKeyOverlap`**

Add to `src/lib/filter.ts`:

```ts
export type OverlapGroup = {
  overlap: number;
  scales: BarryHarrisScale[];
};

export function groupByKeyOverlap(scales: BarryHarrisScale[], keyChroma: string): OverlapGroup[] {
  const buckets = new Map<number, BarryHarrisScale[]>();

  for (const scale of scales) {
    const overlap = countKeyOverlap(keyChroma, scale.chroma);
    if (!buckets.has(overlap)) buckets.set(overlap, []);
    buckets.get(overlap)!.push(scale);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .filter(([_, scales]) => scales.length > 0)
    .map(([overlap, scales]) => ({ overlap, scales }));
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: add groupByKeyOverlap function"
```

---

### Task 3: Add key selector UI and state to +page.svelte

**Files:**
- Modify: `src/routes/+page.svelte`

This is the largest task — it adds the key selector UI, new state, conditional grouping, and updated note highlighting.

**Step 1: Update the script block**

Replace the entire `<script lang="ts">` block in `src/routes/+page.svelte` with:

```ts
<script lang="ts">
  import { Pcset, Scale } from 'tonal';
  import { ALL_SCALES } from '$lib/scales';
  import { filterScales, groupByKeyOverlap } from '$lib/filter';
  import type { OverlapGroup } from '$lib/filter';
  import ScaleDiagram from '$lib/ScaleDiagram.svelte';

  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const MAJOR_MODES = Scale.modeNames('major').map(m => m[1]);
  const HARMONIC_MINOR_MODES = Scale.modeNames('harmonic minor').map(m => m[1]);
  const MELODIC_MINOR_MODES = Scale.modeNames('melodic minor').map(m => m[1]);

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
```

**Step 2: Update the template**

Replace everything inside `<main>` with:

```svelte
<main class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Barry Harris Scale Filter</h1>

  <!-- Target Notes -->
  <div class="mb-6">
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Notes</h2>
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
  </div>

  <!-- Key Selector -->
  <div class="mb-6">
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Key</h2>
    <div class="flex flex-wrap gap-2 mb-3">
      {#each NOTE_NAMES as note}
        <button
          class="px-3 py-2 rounded font-mono text-sm border transition-colors {selectedRoot === note
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'}"
          onclick={() => selectRoot(note)}
        >
          {note}
        </button>
      {/each}
      <button
        class="px-3 py-2 rounded text-sm border border-gray-300 text-gray-500 hover:border-gray-400 transition-colors"
        onclick={clearKey}
      >
        Clear
      </button>
    </div>
    <div class="grid grid-cols-3 gap-x-4 gap-y-1 mb-3">
      <div class="text-xs font-semibold text-gray-400 uppercase">Major</div>
      <div class="text-xs font-semibold text-gray-400 uppercase">Harmonic Minor</div>
      <div class="text-xs font-semibold text-gray-400 uppercase">Melodic Minor</div>
      {#each { length: 7 } as _, i}
        <button
          class="px-2 py-1.5 rounded text-sm text-left border transition-colors {selectedQuality === MAJOR_MODES[i]
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'}"
          onclick={() => selectQuality(MAJOR_MODES[i])}
        >
          {MAJOR_MODES[i]}
        </button>
        <button
          class="px-2 py-1.5 rounded text-sm text-left border transition-colors {selectedQuality === HARMONIC_MINOR_MODES[i]
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'}"
          onclick={() => selectQuality(HARMONIC_MINOR_MODES[i])}
        >
          {HARMONIC_MINOR_MODES[i]}
        </button>
        <button
          class="px-2 py-1.5 rounded text-sm text-left border transition-colors {selectedQuality === MELODIC_MINOR_MODES[i]
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'}"
          onclick={() => selectQuality(MELODIC_MINOR_MODES[i])}
        >
          {MELODIC_MINOR_MODES[i]}
        </button>
      {/each}
    </div>
    {#if selectedKey}
      <p class="text-sm text-gray-500">
        Key: {selectedKey.name} — {selectedKey.notes.join(', ')}
      </p>
    {/if}
  </div>

  <!-- Results Count -->
  <p class="text-sm text-gray-500 mb-4">
    Showing {filteredScales.length} of {ALL_SCALES.length} scales
  </p>

  <!-- Scale Diagram -->
  <div class="mb-6">
    <ScaleDiagram filteredScaleNames={filteredScales.map(s => s.name)} />
  </div>

  <!-- Scale List: grouped by overlap when key active, by type otherwise -->
  {#if selectedKey}
    {#each overlapGroups as group}
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2 text-gray-700">
          {group.overlap} of {selectedKey.notes.length} key notes
        </h2>
        <div class="space-y-2">
          {#each group.scales as scale}
            <div class="p-3 border border-gray-200 rounded">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-medium">{scale.name}</span>
                <span class="text-xs text-gray-400">{group.overlap}/{selectedKey.notes.length}</span>
              </div>
              <div class="flex gap-1.5 flex-wrap">
                {#each Pcset.notes(scale.chroma) as note}
                  <span
                    class="px-1.5 py-0.5 rounded text-sm font-mono text-gray-600"
                    class:font-bold={isKeyNote(note)}
                    class:underline={isTargetNote(note)}
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
          <h2 class="text-lg font-semibold mb-2 text-gray-700">{TYPE_LABELS[type]}</h2>
          <div class="space-y-2">
            {#each scales as scale}
              <div class="p-3 border border-gray-200 rounded">
                <div class="font-medium mb-1">{scale.name}</div>
                <div class="flex gap-1.5 flex-wrap">
                  {#each Pcset.notes(scale.chroma) as note}
                    <span
                      class="px-1.5 py-0.5 rounded text-sm font-mono text-gray-600"
                      class:underline={isTargetNote(note)}
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
```

**Step 3: Verify build and type check**

Run: `npm run check`
Expected: 0 errors

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify existing tests still pass**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add key selector with overlap sorting and note highlighting"
```
