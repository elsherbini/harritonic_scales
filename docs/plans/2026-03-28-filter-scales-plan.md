# Filter Scales Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a website that filters Barry Harris scales by a user-selected collection of notes.

**Architecture:** SvelteKit static site with all logic client-side. Scale data is generated programmatically from tonal.js at module level (45 scales). Filtering uses pcset chroma string comparison. UI is a single page with note toggle buttons and a grouped scale list.

**Tech Stack:** SvelteKit (static adapter), Svelte 5 runes, Tailwind CSS v4, tonal.js

---

### Task 1: Scaffold SvelteKit project with Tailwind and tonal.js

**Files:**
- Create: SvelteKit project scaffold (via `npx sv create`)
- Modify: `svelte.config.js` (static adapter)
- Modify: `vite.config.ts` (tailwind plugin)
- Create: `src/routes/+layout.ts`
- Create: `src/app.css`

**Step 1: Create SvelteKit project**

Run from parent directory (`~/dev`). Create a new SvelteKit project in a temp directory, then move config into our existing project:

```bash
cd /Users/jelsherbini/dev/filter_scales
npx sv create . --no-install
```

Choose: Skeleton project, TypeScript

**Step 2: Add Tailwind via sv**

```bash
npx sv add tailwindcss
```

**Step 3: Install dependencies including tonal and static adapter**

```bash
npm install tonal
npm install -D @sveltejs/adapter-static
```

**Step 4: Configure static adapter**

Edit `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    })
  }
};

export default config;
```

**Step 5: Enable prerendering**

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
```

**Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: dev server starts, default page loads at localhost:5173

**Step 7: Commit**

```bash
git add -A
git commit -m "scaffold: SvelteKit with Tailwind v4, tonal.js, static adapter"
```

---

### Task 2: Scale generation module — `src/lib/scales.ts`

**Files:**
- Create: `src/lib/scales.ts`
- Create: `src/lib/scales.test.ts`

**Step 1: Write the tests**

Create `src/lib/scales.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ALL_SCALES, type BarryHarrisScale } from './scales';

describe('ALL_SCALES', () => {
  it('has exactly 45 scales', () => {
    expect(ALL_SCALES).toHaveLength(45);
  });

  it('has 12 maj6 scales', () => {
    const maj6 = ALL_SCALES.filter(s => s.type === 'maj6');
    expect(maj6).toHaveLength(12);
  });

  it('has 12 min6 scales', () => {
    const min6 = ALL_SCALES.filter(s => s.type === 'min6');
    expect(min6).toHaveLength(12);
  });

  it('has 12 dom7 scales', () => {
    const dom7 = ALL_SCALES.filter(s => s.type === 'dom7');
    expect(dom7).toHaveLength(12);
  });

  it('has 6 dom7b5 scales', () => {
    const dom7b5 = ALL_SCALES.filter(s => s.type === 'dom7b5');
    expect(dom7b5).toHaveLength(6);
  });

  it('has 3 octatonic scales', () => {
    const oct = ALL_SCALES.filter(s => s.type === 'octatonic');
    expect(oct).toHaveLength(3);
  });

  it('each scale has 8 notes in its chroma', () => {
    for (const scale of ALL_SCALES) {
      const noteCount = scale.chroma.split('').filter(c => c === '1').length;
      expect(noteCount, `${scale.name} should have 8 notes`).toBe(8);
    }
  });

  it('all chromas are unique', () => {
    const chromas = ALL_SCALES.map(s => s.chroma);
    expect(new Set(chromas).size).toBe(45);
  });

  it('C Maj6 Diminished has correct notes', () => {
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished');
    expect(cMaj6).toBeDefined();
    // C D E F G Ab A B = positions 0,2,4,5,7,8,9,11
    expect(cMaj6!.chroma).toBe('101011011101');
  });

  it('each scale has a name, type, root, and aliases array', () => {
    for (const scale of ALL_SCALES) {
      expect(scale.name).toBeTruthy();
      expect(scale.type).toBeTruthy();
      expect(scale.root).toBeTruthy();
      expect(Array.isArray(scale.aliases)).toBe(true);
    }
  });
});
```

**Step 2: Install vitest and run tests to verify they fail**

```bash
npm install -D vitest
npx vitest run src/lib/scales.test.ts
```

Expected: FAIL — module `./scales` not found

**Step 3: Implement `src/lib/scales.ts`**

```ts
import { Chord, Note, Pcset } from 'tonal';

export type ScaleType = 'maj6' | 'min6' | 'dom7' | 'dom7b5' | 'octatonic';

export type BarryHarrisScale = {
  name: string;
  aliases: string[];
  type: ScaleType;
  root: string;
  chroma: string;
};

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SCALE_TYPES: { type: ScaleType; chordSuffix: string; label: string }[] = [
  { type: 'maj6', chordSuffix: '6', label: 'Maj6 Diminished' },
  { type: 'min6', chordSuffix: 'm6', label: 'Min6 Diminished' },
  { type: 'dom7', chordSuffix: '7', label: 'Dom7 Diminished' },
  { type: 'dom7b5', chordSuffix: '7b5', label: 'Dom7b5 Diminished' },
  { type: 'octatonic', chordSuffix: 'dim7', label: 'Octatonic' },
];

function generateScales(): BarryHarrisScale[] {
  const scales: BarryHarrisScale[] = [];
  const seenChromas = new Set<string>();

  for (const st of SCALE_TYPES) {
    for (const root of ROOTS) {
      const chordNotes = Chord.get(root + st.chordSuffix).notes;
      const dimRoot = Note.transpose(root, '-2m');
      const dimNotes = Chord.get(dimRoot + 'dim7').notes;
      const chroma = Pcset.chroma([...chordNotes, ...dimNotes]);

      const key = st.type + ':' + chroma;
      if (seenChromas.has(key)) continue;
      seenChromas.add(key);

      scales.push({
        name: `${root} ${st.label}`,
        aliases: [],
        type: st.type,
        root,
        chroma,
      });
    }
  }

  return scales;
}

export const ALL_SCALES = generateScales();
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/scales.test.ts
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/lib/scales.ts src/lib/scales.test.ts
git commit -m "feat: add Barry Harris scale generation with tests"
```

---

### Task 3: Filter module — `src/lib/filter.ts`

**Files:**
- Create: `src/lib/filter.ts`
- Create: `src/lib/filter.test.ts`

**Step 1: Write the tests**

Create `src/lib/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterScales } from './filter';
import { ALL_SCALES } from './scales';

describe('filterScales', () => {
  it('returns all 45 scales when no notes selected', () => {
    const result = filterScales(ALL_SCALES, []);
    expect(result).toHaveLength(45);
  });

  it('filters scales containing C and E', () => {
    const result = filterScales(ALL_SCALES, ['C', 'E']);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(45);
    // C Maj6 Diminished contains C and E
    expect(result.some(s => s.name === 'C Maj6 Diminished')).toBe(true);
  });

  it('returns exact match when all 8 notes selected', () => {
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
    // C Maj6 Dim notes: C D E F G Ab A B
    const result = filterScales(ALL_SCALES, ['C', 'D', 'E', 'F', 'G', 'Ab', 'A', 'B']);
    expect(result.some(s => s.chroma === cMaj6.chroma)).toBe(true);
  });

  it('returns empty when notes match no scale', () => {
    // C Db D — no 8-note BH scale contains only these 3 adjacent semitones
    // Actually let's pick something guaranteed: all 12 notes can't be in any 8-note scale
    const result = filterScales(ALL_SCALES, ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']);
    expect(result).toHaveLength(0);
  });

  it('single note C returns all scales containing C', () => {
    const result = filterScales(ALL_SCALES, ['C']);
    for (const scale of result) {
      // chroma position 0 = C, should be '1'
      expect(scale.chroma[0]).toBe('1');
    }
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/filter.test.ts
```

Expected: FAIL — module `./filter` not found

**Step 3: Implement `src/lib/filter.ts`**

```ts
import { Pcset } from 'tonal';
import type { BarryHarrisScale } from './scales';

export function filterScales(scales: BarryHarrisScale[], selectedNotes: string[]): BarryHarrisScale[] {
  if (selectedNotes.length === 0) return scales;

  const selectedChroma = Pcset.chroma(selectedNotes);

  return scales.filter(scale => {
    return Pcset.isSupersetOf(selectedNotes)(scale.chroma) || Pcset.isEqual(selectedChroma, scale.chroma);
  });
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/filter.test.ts
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: add scale filtering by selected notes"
```

---

### Task 4: Main page UI — `src/routes/+page.svelte`

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/app.css` (if needed for custom styles)

**Step 1: Implement the page**

Write `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { Pcset } from 'tonal';
  import { ALL_SCALES } from '$lib/scales';
  import { filterScales } from '$lib/filter';

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

  function isNoteHighlighted(note: string, scaleChroma: string): boolean {
    if (!selectedChroma) return false;
    // Check if this note is one the user selected by checking its chroma position
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
                    class="px-1.5 py-0.5 rounded text-sm font-mono {isNoteHighlighted(note, scale.chroma)
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
```

**Step 2: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- 12 note buttons display in chromatic order
- "Showing 45 of 45 scales" displays
- All 5 groups display with correct scale counts
- Clicking a note toggles it and filters scales
- Selected notes within matching scales are highlighted
- Clear button resets everything

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add main page with note selector and scale list"
```

---

### Task 5: Layout and final polish

**Files:**
- Modify: `src/routes/+layout.svelte`
- Modify: `src/app.css`

**Step 1: Update the layout**

Edit `src/routes/+layout.svelte`:

```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
  {@render children()}
</div>
```

**Step 2: Build and verify static output**

```bash
npm run build
```

Expected: builds to `build/` directory with no errors.

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add layout, verify static build"
```
