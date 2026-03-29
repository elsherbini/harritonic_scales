# Scale Diagram — Design Document

Embed the Excalidraw SVG diagram of all 45 Barry Harris scales into the web app, with matching scales shown vividly and non-matching scales greyed out based on the current note filter.

## Overview

The existing `scales.excalidraw.svg` contains 45 hand-drawn shapes arranged in a circle, each representing a Barry Harris scale. A preprocessing script tags each shape with a `data-scale` attribute, then a Svelte component embeds the SVG and toggles visual state based on the active filter.

## Preprocessing Script

**File:** `scripts/tag-svg.js`

A one-time Node script that produces a tagged copy of the SVG.

### Inputs
- `scales.excalidraw.svg` — the original Excalidraw export
- A hardcoded color-to-scale mapping (see below)

### Process
1. Parse the SVG as XML
2. Extract all text labels and their `translate(x, y)` coordinates
3. Extract all colored shape groups (identified by `<path>` elements with a non-black, non-white `fill`) and their coordinates
4. Match each text label to its nearest colored shape by coordinate proximity
5. Use the text label + fill color together to unambiguously identify which scale each shape represents, via the color-to-scale lookup table
6. Inject `data-scale="<scale name>"` onto each shape's `<g>` wrapper, where `<scale name>` matches the `name` field from `ALL_SCALES` (e.g. `"C Maj6 Diminished"`)
7. Write the result to `src/lib/assets/scales-tagged.svg`

### Color-to-Scale Mapping

| Color | Scales |
|-------|--------|
| `#f09a41` | A maj6, C maj6, Eb maj6, Gb maj6, A dom7b5, C dom7b5 |
| `#7741f0` | E maj6, G maj6, Bb maj6, Db maj6, E dom7b5, G dom7b5 |
| `#29f043` | F maj6, Ab maj6, B maj6, D maj6, F dom7b5, D dom7b5 |
| `#f0be35` | A min6, C min6, Eb min6, Gb min6 |
| `#f05d35` | A dom7, C dom7, Eb dom7, Gb dom7 |
| `#ce1ced` | E min6, G min6, Bb min6, Db min6 |
| `#a4f04d` | F dom7, Ab dom7, B dom7, D dom7 |
| `#6584f0` | E dom7, G dom7, Bb dom7, Db dom7 |
| `#4df0bf` | F min6, Ab min6, B min6, D min6 |
| `#f0295d` | Db octatonic |
| `#efe341` | C octatonic |
| `#56b4e9` | B octatonic |

### Re-running

Only needed if the Excalidraw source is re-exported. The tagged SVG is committed to the repo.

## Svelte Component

**File:** `src/lib/ScaleDiagram.svelte`

### Props
- `filteredScaleNames: string[]` — names of scales that match the current filter

### Behavior
1. Imports the tagged SVG via Vite's `?raw` import
2. Renders inline with `{@html svgContent}`
3. Uses `$effect` to query all `[data-scale]` elements and toggle a `.dimmed` class based on whether the scale name is in the filtered set
4. When no notes are selected (all 45 match), no shapes are dimmed

### CSS
```css
[data-scale] {
  transition: opacity 0.2s, filter 0.2s;
}
[data-scale].dimmed {
  opacity: 0.15;
  filter: saturate(0);
}
```

Connector lines and text labels are not modified — they remain at full opacity.

## Page Integration

In `src/routes/+page.svelte`:

1. Import `ScaleDiagram`
2. Place between the results count and the scale list
3. Pass filtered scale names derived from the existing `filteredScales` array

```
Note Selector (existing)
Results Count (existing)
─────────────────────────
Scale Diagram (new)
─────────────────────────
Scale List (existing)
```

No changes to existing filtering logic, state management, or scale list.

## What's Deliberately Out of Scope

- Clicking shapes in the diagram
- Fading/hiding connector lines
- Replacing the text-based scale list
- Re-laying out or programmatically generating the diagram
- Tooltips or hover effects on shapes
