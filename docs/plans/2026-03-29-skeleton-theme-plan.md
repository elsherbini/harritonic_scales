# Skeleton UI Theme Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hand-styled Tailwind markup with Skeleton UI components and the Concord theme, adding a light/dark mode toggle.

**Architecture:** Install Skeleton packages, configure the Concord theme via CSS imports and `data-theme` attribute, swap all UI elements to use Skeleton's chip/button/card/switch classes. Dark mode uses Tailwind's `dark` selector strategy with localStorage persistence.

**Tech Stack:** SvelteKit, Tailwind v4, @skeletonlabs/skeleton, @skeletonlabs/skeleton-svelte, tonal.js

---

### Task 1: Install Skeleton packages

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run (from worktree root `/Users/jelsherbini/dev/filter_scales/.worktrees/skeleton-theme`):
```bash
npm install -D @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte
```

**Step 2: Verify install succeeded**

Run: `npm ls @skeletonlabs/skeleton @skeletonlabs/skeleton-svelte`
Expected: Both packages listed without errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install skeleton UI packages"
```

---

### Task 2: Configure Concord theme and CSS imports

**Files:**
- Modify: `src/app.css`
- Modify: `src/app.html`

**Step 1: Update app.css**

Replace the entire contents of `src/app.css` with:

```css
@import "tailwindcss";
@import "@skeletonlabs/skeleton";
@import "@skeletonlabs/skeleton-svelte";
@import "@skeletonlabs/skeleton/themes/concord";
```

**Step 2: Update app.html**

Change the `<html>` tag from:
```html
<html lang="en">
```
to:
```html
<html lang="en" data-theme="concord">
```

**Step 3: Verify the dev server starts**

Run: `npm run dev` and confirm no errors in console. Visit http://localhost:5173 — the page should load (may look broken since we haven't updated components yet, but no crashes).

**Step 4: Commit**

```bash
git add src/app.css src/app.html
git commit -m "feat: configure Skeleton with Concord theme"
```

---

### Task 3: Update layout with dark mode toggle

**Files:**
- Modify: `src/routes/+layout.svelte`

**Step 1: Replace layout contents**

Replace the entire contents of `src/routes/+layout.svelte` with:

```svelte
<script lang="ts">
  import '../app.css';
  import { Switch } from '@skeletonlabs/skeleton-svelte';
  import { browser } from '$app/environment';

  let { children } = $props();

  let dark = $state(false);

  // On mount: check localStorage, fall back to system preference
  if (browser) {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      dark = true;
    } else if (stored === 'light') {
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  $effect(() => {
    if (!browser) return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
</script>

<div class="min-h-screen bg-surface-50-950">
  <header class="max-w-3xl mx-auto px-4 pt-4 flex justify-end">
    <Switch checked={dark} onCheckedChange={(e) => (dark = e.checked)}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>{dark ? 'Dark' : 'Light'}</Switch.Label>
      <Switch.HiddenInput />
    </Switch>
  </header>
  {@render children()}
</div>
```

**Step 2: Verify the toggle works**

Run dev server. The Switch should appear top-right. Toggling it should add/remove the `dark` class on `<html>` and persist across page reloads.

**Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: add dark mode toggle with Skeleton Switch"
```

---

### Task 4: Swap page UI to Skeleton components

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Replace the template section (everything after `</script>`)**

Keep the entire `<script>` block unchanged (lines 1-126). Replace everything from line 127 (`<main>`) to line 303 (end of file) with:

```svelte
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
            ? 'preset-filled-success-500'
            : 'preset-outlined-surface-500'}"
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
          ? 'preset-filled-success-500'
          : 'preset-outlined-surface-500'}"
        onclick={() => selectQuality('major')}
      >
        Major
      </button>
      <button
        class="chip {selectedQuality === 'minor'
          ? 'preset-filled-success-500'
          : 'preset-outlined-surface-500'}"
        onclick={() => selectQuality('minor')}
      >
        Natural Minor
      </button>
      <select
        class="select text-sm max-w-48 {isSomethingElse(selectedQuality)
          ? 'preset-filled-success-500'
          : ''}"
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
            ? 'preset-filled-primary-500'
            : 'preset-outlined-surface-500'}"
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
```

**Step 2: Verify the page renders correctly**

Run dev server. Check:
- Key root notes render as chips, selecting one highlights green
- Quality buttons render as chips
- Target note chips highlight blue when selected
- Clear buttons use tonal surface style
- Scale cards use Skeleton card classes
- Select dropdown is styled
- All functionality (filtering, overlap grouping, note highlighting) still works

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: swap all UI elements to Skeleton components"
```

---

### Task 5: Run tests and verify build

**Step 1: Run tests**

Run: `npx vitest run`
Expected: All 21 tests pass (tests only cover `scales.ts` and `filter.ts` — no UI tests to break).

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit design doc and plan**

```bash
git add docs/plans/
git commit -m "docs: add Skeleton theme design doc and implementation plan"
```
