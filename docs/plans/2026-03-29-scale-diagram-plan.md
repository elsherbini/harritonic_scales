# Scale Diagram Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed the Excalidraw SVG diagram into the page and highlight/dim scales based on the active note filter.

**Architecture:** A one-time Node script tags each shape in the SVG with `data-scale` attributes by matching text labels + colors to scale names. A Svelte component renders the tagged SVG inline and toggles a `.dimmed` CSS class on non-matching shapes via `$effect`.

**Tech Stack:** Node.js (script), SvelteKit, Vite `?raw` import, CSS transitions

---

### Task 1: Create the SVG tagging script

**Files:**
- Create: `scripts/tag-svg.js`

**Step 1: Write the tagging script**

This script parses the Excalidraw SVG, matches text labels to nearby colored shapes by coordinate proximity, and injects `data-scale` attributes.

```js
#!/usr/bin/env node

// scripts/tag-svg.js
// One-time script to tag scales.excalidraw.svg with data-scale attributes.
// Run: node scripts/tag-svg.js
// Output: src/lib/assets/scales-tagged.svg

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const SVG_INPUT = 'scales.excalidraw.svg';
const SVG_OUTPUT = 'src/lib/assets/scales-tagged.svg';

// Color-to-scale-type mapping from the Excalidraw diagram.
// Each color maps to a list of [textLabel, scaleName] pairs.
// textLabel is what appears in the SVG; scaleName matches ALL_SCALES[].name.
const COLOR_SCALE_MAP = {
  '#f09a41': [
    ['A6', 'A Maj6 Diminished'],
    ['C6', 'C Maj6 Diminished'],
    ['Eb6', 'Eb Maj6 Diminished'],
    ['Gb6', 'Gb Maj6 Diminished'],
    ['A7 b5', 'A Dom7b5 Diminished'],
    ['C7 b5', 'C Dom7b5 Diminished'],
  ],
  '#7741f0': [
    ['E6', 'E Maj6 Diminished'],
    ['G6', 'G Maj6 Diminished'],
    ['Bb6', 'Bb Maj6 Diminished'],
    ['Db6', 'Db Maj6 Diminished'],
    ['E7 b5', 'E Dom7b5 Diminished'],
    ['G7 b5', 'G Dom7b5 Diminished'],
  ],
  '#29f043': [
    ['F6', 'F Maj6 Diminished'],
    ['Ab6', 'Ab Maj6 Diminished'],
    ['B6', 'B Maj6 Diminished'],
    ['D6', 'D Maj6 Diminished'],
    ['F7 b5', 'F Dom7b5 Diminished'],
    ['D7 b5', 'D Dom7b5 Diminished'],
  ],
  '#f0be35': [
    ['A min6', 'A Min6 Diminished'],
    ['C min6', 'C Min6 Diminished'],
    ['Eb min6', 'Eb Min6 Diminished'],
    ['Gb min6', 'Gb Min6 Diminished'],
  ],
  '#f05d35': [
    ['A7', 'A Dom7 Diminished'],
    ['C7', 'C Dom7 Diminished'],
    ['Eb7', 'Eb Dom7 Diminished'],
    ['Gb7', 'Gb Dom7 Diminished'],
  ],
  '#ce1ced': [
    ['E min6', 'E Min6 Diminished'],
    ['G min6', 'G Min6 Diminished'],
    ['Bb min6', 'Bb Min6 Diminished'],
    ['Db min6', 'Db Min6 Diminished'],
  ],
  '#a4f04d': [
    ['F7', 'F Dom7 Diminished'],
    ['Ab7', 'Ab Dom7 Diminished'],
    ['B7', 'B Dom7 Diminished'],
    ['D7', 'D Dom7 Diminished'],
  ],
  '#6584f0': [
    ['E7', 'E Dom7 Diminished'],
    ['G7', 'G Dom7 Diminished'],
    ['Bb7', 'Bb Dom7 Diminished'],
    ['Db7', 'Db Dom7 Diminished'],
  ],
  '#4df0bf': [
    ['F min6', 'F Min6 Diminished'],
    ['Ab min6', 'Ab Min6 Diminished'],
    ['B min6', 'B Min6 Diminished'],
    ['D min6', 'D Min6 Diminished'],
  ],
  '#f0295d': [
    [null, 'Db Octatonic'],
  ],
  '#efe341': [
    [null, 'C Octatonic'],
  ],
  '#56b4e9': [
    [null, 'D Octatonic'],
  ],
};

const svg = readFileSync(SVG_INPUT, 'utf-8');

// --- Extract text labels with positions ---
// Multi-line labels (like "C7\nb5" or "C\nmin6") are two <text> elements
// inside one <g transform="translate(X Y) ..."> group.
// Single-line labels are one <text> inside one <g>.
const textGroupRe = /<g[^>]*transform="[^"]*translate\(([0-9.e+-]+)\s+([0-9.e+-]+)\)[^"]*"[^>]*>((?:<text[^>]*>[^<]+<\/text>)+)<\/g>/g;

const textLabels = []; // { x, y, label }
let m;
while ((m = textGroupRe.exec(svg)) !== null) {
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  const textBlock = m[3];
  const parts = [...textBlock.matchAll(/>([^<]+)<\/text>/g)].map(p => p[1]);
  const label = parts.join(' '); // "C7 b5", "C min6", "C7", "C6", etc.
  textLabels.push({ x, y, label });
}

// --- Extract colored shapes with positions ---
// Each colored shape has a <path fill="#color"...> inside a <g> with a translate.
// We need to find the <g> wrapper that we'll add data-scale to.
const colorFillRe = /fill="(#[0-9a-fA-F]{6,8})"/g;
const translateRe = /translate\(([0-9.e+-]+)\s+([0-9.e+-]+)\)/g;

const coloredShapes = []; // { x, y, color, pos (char position of the <g> to tag) }

// Find each colored fill and walk backwards to find its parent <g> with translate
let cm;
while ((cm = colorFillRe.exec(svg)) !== null) {
  const color = cm[1].substring(0, 7); // strip alpha suffix
  if (color === '#000000' || color === '#ffffff') continue;

  const searchStart = Math.max(0, cm.index - 2000);
  const snippet = svg.substring(searchStart, cm.index);

  // Find all translates in the snippet, take the last one
  const translates = [...snippet.matchAll(/translate\(([0-9.e+-]+)\s+([0-9.e+-]+)\)/g)];
  if (translates.length === 0) continue;

  const last = translates[translates.length - 1];
  const x = parseFloat(last[1]);
  const y = parseFloat(last[2]);

  // Find the <g that contains this translate — we'll inject data-scale on it.
  // Walk backwards from the fill to find the opening <g of the shape group.
  // We want the outermost <g stroke-linecap="round"...> that wraps the shape.
  const beforeFill = svg.substring(Math.max(0, cm.index - 2000), cm.index);
  // Find all <g positions
  const gPositions = [...beforeFill.matchAll(/<g\s/g)];
  // The shape's wrapper <g> is the one with stroke-linecap="round" closest to the fill
  let wrapperPos = null;
  for (let i = gPositions.length - 1; i >= 0; i--) {
    const gStart = searchStart + gPositions[i].index;
    const gTag = svg.substring(gStart, gStart + 200);
    if (gTag.includes('stroke-linecap="round"')) {
      wrapperPos = gStart;
      break;
    }
  }

  coloredShapes.push({ x, y, color, wrapperPos });
}

// --- Match labels to shapes ---
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Build a flat list of all expected assignments: { color, textLabel, scaleName }
const assignments = [];
for (const [color, scales] of Object.entries(COLOR_SCALE_MAP)) {
  for (const [textLabel, scaleName] of scales) {
    assignments.push({ color, textLabel, scaleName });
  }
}

// For each colored shape, find its assignment:
// 1. Filter assignments by matching color
// 2. If the assignment has a textLabel, find the nearest text label that matches
// 3. If textLabel is null (octatonic), assign by color alone (only 1 per color)
const tagInsertions = []; // { wrapperPos, scaleName }
const usedAssignments = new Set();
const usedShapes = new Set();

for (const shape of coloredShapes) {
  const candidates = assignments.filter(
    (a, i) => a.color === shape.color && !usedAssignments.has(i)
  );

  if (candidates.length === 0) continue;

  // Octatonic: null textLabel, 1 candidate per color
  const nullCandidate = candidates.find(c => c.textLabel === null);
  if (nullCandidate) {
    const idx = assignments.indexOf(nullCandidate);
    usedAssignments.add(idx);
    tagInsertions.push({ wrapperPos: shape.wrapperPos, scaleName: nullCandidate.scaleName });
    continue;
  }

  // Find the nearest matching text label for each candidate
  let bestCandidate = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    // Find text labels that match this candidate's textLabel
    const matchingTexts = textLabels.filter(t => t.label === c.textLabel);
    for (const t of matchingTexts) {
      const d = distance(shape, t);
      if (d < bestDist) {
        bestDist = d;
        bestCandidate = c;
      }
    }
  }

  if (bestCandidate && bestDist < 200) {
    const idx = assignments.indexOf(bestCandidate);
    usedAssignments.add(idx);
    tagInsertions.push({ wrapperPos: shape.wrapperPos, scaleName: bestCandidate.scaleName });
  }
}

// --- Inject data-scale attributes ---
// Sort insertions by position descending so we can insert without shifting offsets
tagInsertions.sort((a, b) => b.wrapperPos - a.wrapperPos);

let result = svg;
for (const { wrapperPos, scaleName } of tagInsertions) {
  // Find the end of the <g tag to insert the attribute before the >
  const closeIdx = result.indexOf('>', wrapperPos);
  // Insert data-scale="..." before the >
  const attr = ` data-scale="${scaleName}"`;
  result = result.substring(0, closeIdx) + attr + result.substring(closeIdx);
}

// --- Write output ---
mkdirSync(dirname(SVG_OUTPUT), { recursive: true });
writeFileSync(SVG_OUTPUT, result);

// --- Verify ---
const tagged = [...result.matchAll(/data-scale="([^"]+)"/g)].map(m => m[1]);
console.log(`Tagged ${tagged.length} of 45 scales:`);
for (const name of tagged.sort()) {
  console.log(`  ✓ ${name}`);
}

const expected = assignments.map(a => a.scaleName).sort();
const missing = expected.filter(n => !tagged.includes(n));
if (missing.length > 0) {
  console.log(`\nMISSING ${missing.length} scales:`);
  for (const n of missing) console.log(`  ✗ ${n}`);
  process.exit(1);
} else {
  console.log(`\nAll 45 scales tagged successfully.`);
}
```

**Step 2: Run the script and verify all 45 scales are tagged**

Run: `node scripts/tag-svg.js`
Expected: Output showing all 45 scales tagged, file written to `src/lib/assets/scales-tagged.svg`

If some scales are missing, debug by examining the coordinate matching. The script prints which are missing.

**Step 3: Commit**

```bash
git add scripts/tag-svg.js src/lib/assets/scales-tagged.svg
git commit -m "feat: add SVG tagging script, generate tagged diagram"
```

---

### Task 2: Create the ScaleDiagram component

**Files:**
- Create: `src/lib/ScaleDiagram.svelte`

**Step 1: Write the component**

```svelte
<script lang="ts">
  import svgRaw from '$lib/assets/scales-tagged.svg?raw';

  let { filteredScaleNames }: { filteredScaleNames: string[] } = $props();

  let container: HTMLDivElement;

  $effect(() => {
    if (!container) return;
    const filteredSet = new Set(filteredScaleNames);
    const shapes = container.querySelectorAll('[data-scale]');
    for (const el of shapes) {
      const name = el.getAttribute('data-scale')!;
      el.classList.toggle('dimmed', !filteredSet.has(name));
    }
  });
</script>

<div class="scale-diagram" bind:this={container}>
  {@html svgRaw}
</div>

<style>
  .scale-diagram :global(svg) {
    width: 100%;
    height: auto;
    max-width: 600px;
    margin: 0 auto;
    display: block;
  }

  .scale-diagram :global([data-scale]) {
    transition: opacity 0.2s, filter 0.2s;
  }

  .scale-diagram :global([data-scale].dimmed) {
    opacity: 0.15;
    filter: saturate(0);
  }
</style>
```

**Step 2: Verify the component renders by temporarily adding it to the page**

In `src/routes/+page.svelte`, add a quick import and render to confirm the SVG shows up:

```svelte
import ScaleDiagram from '$lib/ScaleDiagram.svelte';
```

```svelte
<ScaleDiagram filteredScaleNames={filteredScales.map(s => s.name)} />
```

Run: `npm run dev` and visually verify the diagram appears.

**Step 3: Commit**

```bash
git add src/lib/ScaleDiagram.svelte
git commit -m "feat: add ScaleDiagram component with dimming"
```

---

### Task 3: Integrate into the page

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add the diagram between results count and scale list**

Add the import at the top of the `<script>` block:

```ts
import ScaleDiagram from '$lib/ScaleDiagram.svelte';
```

Add the component between the note selector section and the scale list section:

```svelte
<!-- Scale Diagram -->
<div class="mb-6">
  <ScaleDiagram filteredScaleNames={filteredScales.map(s => s.name)} />
</div>
```

**Step 2: Verify the full flow**

Run: `npm run dev`
- Select no notes → all shapes vivid
- Select "C" → some shapes dim, matching ones stay vivid
- Select "C" + "E" → more shapes dim
- Click "Clear" → all shapes vivid again
- Transitions should be smooth (0.2s)

**Step 3: Verify the build works**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: integrate scale diagram into main page"
```

---

### Task 4: Add type declaration for ?raw SVG imports

**Files:**
- Modify: `src/app.d.ts`

**Step 1: Check if Vite client types are already included**

Read `src/app.d.ts`. If it doesn't already have a `*.svg?raw` module declaration, add one:

```ts
declare module '*.svg?raw' {
  const content: string;
  export default content;
}
```

This may not be needed if `vite/client` types are already included in tsconfig. Check `npm run check` first.

**Step 2: Verify type checking passes**

Run: `npm run check`
Expected: No type errors.

**Step 3: Commit if changes were needed**

```bash
git add src/app.d.ts
git commit -m "chore: add type declaration for raw SVG imports"
```
