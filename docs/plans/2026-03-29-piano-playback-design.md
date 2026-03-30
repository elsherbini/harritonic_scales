# Piano Component & Scale Playback

## Goal

Add an interactive piano that plays Rhodes samples via Tone.js, with per-card play buttons that sequence chords through scalar movement within the diminished scale.

## Architecture

### New Files
- `src/lib/Piano.svelte` — Visual piano (E1-E7), click/drag to play, highlights active notes. Loads Rhodes samples via Tone.Sampler, routed through Tone.Reverb. Exposes methods: playNote, triggerAttack, triggerRelease, sustainOn, sustainOff.
- `src/lib/keymap.ts` — TypeScript port of KeyMap.js. Generates piano key positions and MIDI data for rendering.
- `src/lib/playback.ts` — Sequence scheduling and voicing logic. Contains playSequence() and getClosedVoicing().

### New Dependency
- `tone` (Tone.js) — Sampler, Transport, Reverb

### Static Assets
- Copy Rhodes MP3 samples from scratch app into `static/audio/rhodes/`

### No Changes To
- scales.ts, filter.ts, ScaleDiagram.svelte

## Page Layout

Piano sits between the scale diagram and the scale list, always visible. Single shared instance.

## Target Note Root Selection

Double-click or long-press (300ms) on a target note chip selects it (if not already) and marks it as root (`targetRoot` state). Single-click still toggles selection. If root note is deselected, targetRoot resets to null. Root chip gets a thick border (3-4px solid, light-dark aware).

## Closed Voicing

`getClosedVoicing(targetRoot, selectedNotes)` orders selected notes upward from the root within one octave. This determines actual pitches passed to the sampler (e.g., G3, Bb3, Db4, E4).

## Play Buttons

Each scale card gets a play button (btn-icon). Only active when a key is selected. Clicking play on one card stops any current sequence and starts the new one.

## Playback Sequence (8 beats)

Given a selected key, target chord (with root), and a diminished scale:

1. Beats 1-2: Tonic chord (closed voicing from key root) + key root one octave below
2. Beats 3-4: Target chord (closed voicing from target root) + target root one octave below
3. Beat 5: Target chord shifted down one scalar step within the diminished scale + target root below
4. Beat 6: Target chord shifted up one scalar step within the diminished scale + target root below
5. Beats 7-8: Target chord again + target root below

Sustain pedal engaged during chord changes. Scheduled via Tone.Transport.

## Scalar Step Logic

"Step down" moves each note in the target chord to the previous note in the diminished scale. "Step up" moves each to the next note. Wraps around the octave using the scale's note order.

## Tonic Chord

Built from key root using tonal's Chord.get() — major triad for major keys, minor triad for minor, etc.

## Piano Interaction

Click/drag to play notes manually always works regardless of key selection. Only the sequence playback requires a key.

## Visual Feedback

Piano keys get a "playing" CSS class when active (both manual and sequenced). Notes highlight in real time during playback.
