# Filter Scales — Design Document

A website for filtering Barry Harris scales by a collection of notes.

## Problem

Barry Harris's system uses 5 scale types (45 total scales across all keys). Given a set of notes — say the notes in a voicing you're playing — you want to quickly see which Barry Harris scales contain those notes.

## Scale Definitions

All scales are constructed from a chord + the diminished 7th chord a half step below the chord root.

| Type | Chord | Count | Example (root C) |
|------|-------|-------|-------------------|
| Maj6 Diminished | maj6 | 12 | C E G A + B D F Ab |
| Min6 Diminished | m6 | 12 | C Eb G A + B D F Ab |
| Dom7 Diminished | 7 | 12 | C E G Bb + B D F Ab |
| Dom7b5 Diminished | 7b5 | 6 | C E Gb Bb + B D F Ab |
| Octatonic | dim7 + dim7 | 3 | C Eb Gb A + B D F Ab |

**Total: 45 scales.**

Dom7b5 produces 6 unique scales (not 12) and Octatonic produces 3, due to the symmetric structure of diminished chords.

## Data Model

Each scale is stored as:

```ts
type BarryHarrisScale = {
  name: string        // "C Maj6 Diminished"
  aliases: string[]   // flexible, empty for now
  type: "maj6" | "min6" | "dom7" | "dom7b5" | "octatonic"
  root: string        // "C" (for display/grouping only)
  chroma: string      // 12-char binary string, e.g. "111101011101"
}
```

The chroma string is the source of truth. Note names are derived at render time using `Pcset.notes(chroma)`. This avoids all enharmonic issues — filtering and comparison operate entirely on chroma strings.

## Scale Generation

Scales are generated programmatically at module level using tonal.js:

1. Define the 12 roots using flats for accidentals: C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B
2. For each root and scale type, use `Chord.notes(chordType, root)` to get the chord notes
3. Use `Note.transpose(root, "-1m")` to get the diminished root (half step below)
4. Use `Chord.notes("dim7", dimRoot)` to get the diminished chord notes
5. Combine both note arrays and compute the chroma via `Pcset.chroma([...chordNotes, ...dimNotes])`
6. Deduplicate: skip scales whose chroma already exists (handles dom7b5 and octatonic symmetry)

## Filtering Logic

When the user selects notes:

1. Convert selected notes to a chroma string: `Pcset.chroma(selectedNotes)`
2. For each scale, check if the scale's chroma is a superset of the selection using `Pcset.isSupersetOf(selectedChroma)(scaleChroma)`
3. Also check `Pcset.isEqual(selectedChroma, scaleChroma)` since `isSupersetOf` requires a strict superset
4. Show scales where either check is true

When no notes are selected, show all 45 scales.

## Frontend

Single page, three areas stacked vertically:

### Note Selector

12 toggle buttons in chromatic order: C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B. Always flats for accidentals. A "Clear" button resets the selection. Toggling a note immediately filters results.

### Results Count

Text like "Showing 45 of 45 scales" that updates live.

### Scale List

Scales grouped by type with section headers:
- Maj6 Diminished
- Min6 Diminished
- Dom7 Diminished
- Dom7b5 Diminished
- Octatonic

Each scale displays:
- Scale name (e.g. "C Maj6 Diminished")
- The notes of the scale, with user's selected notes visually highlighted

Scales that don't match the filter are hidden.

## Tech Stack

- SvelteKit (static adapter, SPA mode)
- Svelte 5 runes (`$state`, `$derived`)
- Tailwind CSS v4
- tonal.js (pcset, chord, note modules)

## Project Structure

```
src/
  lib/
    scales.ts       # BarryHarrisScale type, generation, ALL_SCALES export
    filter.ts       # Filtering function (chroma comparison)
  routes/
    +page.svelte    # Note selector, results count, scale list
    +layout.svelte  # Minimal layout wrapper
```

## State Management

All client-side, using Svelte 5 runes:

- `$state`: `selectedNotes: Set<string>` (set of note names like "C", "Eb")
- `$derived`: `selectedChroma` computed from selectedNotes via `Pcset.chroma()`
- `$derived`: `filteredScales` computed by filtering ALL_SCALES against selectedChroma

## What's Deliberately Out of Scope

- Audio playback
- URL state / shareable links
- Dark mode toggle
- Mobile-specific layout beyond basic Tailwind responsiveness
- Scale detection (reverse lookup from notes to scale name)
- Custom scale definitions
