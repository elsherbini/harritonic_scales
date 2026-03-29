# Key Selector — Design Document

Add a key selector that sorts Barry Harris scales by overlap with a chosen 7-note key, complementing the existing target note filter.

## Problem

A musician composing in a key (e.g., C major) wants to find Barry Harris scales that fit that key as closely as possible, while also containing specific target notes (e.g., an Fm6 voicing). The current tool filters by target notes but doesn't rank by key fit.

## Key Selector UI

### Root Note Toggle Group

12 buttons in chromatic order (C, Db, D, ..., B). Single-select — clicking one deselects the previous. A "Clear" button deselects the root.

### Key Quality Grid

Three columns of 7 buttons, single-select across the entire grid:

| Major | Harmonic Minor | Melodic Minor |
|-------|----------------|---------------|
| major | harmonic minor | melodic minor |
| dorian | locrian 6 | dorian b2 |
| phrygian | major augmented | lydian augmented |
| lydian | dorian #4 | lydian dominant |
| mixolydian | phrygian dominant | mixolydian b6 |
| minor | lydian #9 | locrian #2 |
| locrian | ultralocrian | altered |

Mode names come from `Scale.modeNames()` for major, harmonic minor, and melodic minor.

Both a root and quality must be selected for the key to be active. Display the resolved key name and its 7 notes when active.

## Sorting and Grouping Logic

When a key is selected:

1. Compute key notes via `Scale.get(root + ' ' + quality).notes`
2. Convert to chroma string
3. For each filtered scale, count how many of the key's 7 chroma positions overlap with the scale's 8-note chroma
4. Group scales by overlap count with section headers (e.g., "7 of 7 key notes", "6 of 7 key notes")
5. Within each overlap group, maintain stable order (by type then root)
6. Hide empty groups

When no key is selected, keep the current type-based grouping (Maj6, Min6, Dom7, Dom7b5, Octatonic).

## Note Highlighting

Two independent visual treatments on each scale card's notes:

- **Target notes → underline.** Notes selected by the user as target notes.
- **Key notes → bold.** Notes that appear in the selected key.

A note can be both (bold + underlined), one, or neither. This replaces the current blue background highlight for target notes.

Each scale card also shows an overlap count label (e.g., "5 of 7 key notes") next to the scale name when a key is active.

## Scale Diagram

No change. The diagram reacts only to target note filtering (vivid/desaturated). Key sorting does not affect the diagram.

## State Management

All in `+page.svelte` using Svelte 5 runes:

- `$state`: `selectedRoot: string | null` — selected root note
- `$state`: `selectedQuality: string | null` — selected mode name
- `$derived`: `selectedKey` — when both set, `Scale.get(root + ' ' + quality)` for notes/chroma; null otherwise
- `$derived`: `keyOverlapScales` — filtered scales grouped by overlap count (key active) or by type (no key)

No new modules needed. Overlap counting is inline chroma comparison.

## Interaction with Target Notes

Independent. Target notes filter which scales are shown. Key selection sorts/groups whatever remains. Both can be active simultaneously.

Example: User selects C major as key, then F, Ab, C, Db as target notes. The list shows only scales containing those 4 notes, sorted by how many C major notes each scale contains.

## What's Deliberately Out of Scope

- Key selector affecting the diagram
- Persisting key selection in URL
- Custom/non-standard scales
- Showing the key's notes in the root note selector
