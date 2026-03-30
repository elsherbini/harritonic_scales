# Piano & Scale Playback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive piano that plays Rhodes samples via Tone.js, with per-card play buttons that sequence chords through scalar movement within the diminished scale.

**Architecture:** Port the piano UI and Tone.js sampler from the scratch app as a stripped-down Svelte 5 component. Add a playback module that schedules an 8-beat chord sequence on Tone.Transport. Add target root note selection via double-click/long-press. Integrate into the main page between the SVG diagram and scale list.

**Tech Stack:** SvelteKit, Svelte 5 runes, Tone.js, tonal.js, Skeleton UI (Concord theme)

---

### Task 1: Install Tone.js and copy Rhodes samples

**Files:**
- Modify: `package.json`
- Create: `static/audio/rhodes/` (74 MP3 files)

**Step 1: Install tone**

Run from worktree root `/Users/jelsherbini/dev/filter_scales/.worktrees/piano-playback`:
```bash
npm install tone
```

**Step 2: Copy Rhodes samples**

```bash
cp -r /Users/jelsherbini/dev/filter_scales/scratch/paratonic_scale_finder/static/audio/rhodes/ /Users/jelsherbini/dev/filter_scales/.worktrees/piano-playback/static/audio/rhodes/
```

**Step 3: Verify samples copied**

```bash
ls static/audio/rhodes/ | wc -l
```
Expected: 74

**Step 4: Commit**

```bash
git add package.json package-lock.json static/audio/rhodes/
git commit -m "chore: install tone.js and add Rhodes piano samples"
```

---

### Task 2: Create keymap.ts

**Files:**
- Create: `src/lib/keymap.ts`
- Create: `src/lib/keymap.test.ts`

**Step 1: Write the test**

Create `src/lib/keymap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateKeys } from './keymap';

describe('generateKeys', () => {
  it('generates keys from E1 to E7', () => {
    const keys = generateKeys('E1', 'E7');
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0].key).toBe('E1');
    expect(keys[keys.length - 1].key).toBe('E7');
  });

  it('marks black keys correctly', () => {
    const keys = generateKeys('C4', 'C5');
    const cSharp = keys.find(k => k.key === 'C#4');
    const d = keys.find(k => k.key === 'D4');
    expect(cSharp?.isBlack).toBe(true);
    expect(d?.isBlack).toBe(false);
  });

  it('assigns MIDI values', () => {
    const keys = generateKeys('C4', 'C5');
    const c4 = keys.find(k => k.key === 'C4');
    expect(c4?.midi).toBe(60);
  });

  it('positions white keys sequentially', () => {
    const keys = generateKeys('C4', 'E4');
    const whiteKeys = keys.filter(k => !k.isBlack);
    for (let i = 1; i < whiteKeys.length; i++) {
      expect(whiteKeys[i].x).toBeGreaterThan(whiteKeys[i - 1].x);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/keymap.test.ts`
Expected: FAIL — module not found

**Step 3: Implement keymap.ts**

Create `src/lib/keymap.ts`:

```typescript
import * as Tone from 'tone';

export type PianoKey = {
  key: string;
  midi: number;
  x: number;
  isBlack: boolean;
};

const semitones: Record<number, string> = {
  1: 'C', 2: 'C#', 3: 'D', 4: 'D#', 5: 'E', 6: 'F',
  7: 'F#', 8: 'G', 9: 'G#', 10: 'A', 11: 'A#', 12: 'B',
};

const WHITE_KEY_WIDTH = 24;
const BLACK_KEY_WIDTH = 16;
const BLACK_KEY_OFFSET = WHITE_KEY_WIDTH / 2 + (WHITE_KEY_WIDTH - BLACK_KEY_WIDTH) / 2;

function getSemitoneIndex(noteName: string): number {
  return Object.entries(semitones).findIndex(([, n]) => n === noteName) + 1;
}

function getOctave(note: string): number {
  return parseInt(note.replace(/[^0-9]/g, ''));
}

function getNoteName(note: string): string {
  return note.replace(/[0-9]/g, '');
}

export function generateKeys(firstNote = 'E1', lastNote = 'E7'): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteKeyNum = 0;
  let currentIndex = 0;

  for (let oct = getOctave(firstNote); oct <= getOctave(lastNote); oct++) {
    const isLowestOctave = oct === getOctave(firstNote);
    const isHighestOctave = oct === getOctave(lastNote);
    const startingNote = isLowestOctave ? getSemitoneIndex(getNoteName(firstNote)) : 1;
    const endNote = isHighestOctave ? getSemitoneIndex(getNoteName(lastNote)) : 12;

    for (let note = startingNote; note <= endNote; note++) {
      const key = semitones[note] + oct;
      const isBlack = semitones[note].includes('#');
      keys.push({
        key,
        midi: Tone.Frequency(semitones[note] + oct).toMidi(),
        x: isBlack ? keys[currentIndex - 1].x + BLACK_KEY_OFFSET : whiteKeyNum * WHITE_KEY_WIDTH,
        isBlack,
      });
      currentIndex++;
      if (!isBlack) whiteKeyNum++;
    }
  }

  return keys;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/keymap.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/lib/keymap.ts src/lib/keymap.test.ts
git commit -m "feat: add piano keymap generator"
```

---

### Task 3: Create Piano.svelte component

**Files:**
- Create: `src/lib/Piano.svelte`

This is a UI component — no unit test, verified by building and visual inspection.

**Step 1: Create the component**

Create `src/lib/Piano.svelte`:

```svelte
<script lang="ts">
  import * as Tone from 'tone';
  import { generateKeys, type PianoKey } from './keymap';
  import { base } from '$app/paths';

  const RHODES_URLS: Record<string, string> = {
    A1: "RhodesMK1_A1_60.mp3", A2: "RhodesMK1_A2_60.mp3", A3: "RhodesMK1_A3_70.mp3",
    A4: "RhodesMK1_A4_60.mp3", A5: "RhodesMK1_A5_60.mp3", A6: "RhodesMK1_A6_70.mp3",
    "A#1": "RhodesMK1_As1_60.mp3", "A#2": "RhodesMK1_As2_70.mp3", "A#3": "RhodesMK1_As3_70.mp3",
    "A#4": "RhodesMK1_As4_60.mp3", "A#5": "RhodesMK1_As5_60.mp3", "A#6": "RhodesMK1_As6_70.mp3",
    B1: "RhodesMK1_B1_60.mp3", B2: "RhodesMK1_B2_70.mp3", B3: "RhodesMK1_B3_70.mp3",
    B4: "RhodesMK1_B4_70.mp3", B5: "RhodesMK1_B5_60.mp3", B6: "RhodesMK1_B6_60.mp3",
    C2: "RhodesMK1_C2_60.mp3", C3: "RhodesMK1_C3_70.mp3", C4: "RhodesMK1_C4_70.mp3",
    C5: "RhodesMK1_C5_60.mp3", C6: "RhodesMK1_C6_60.mp3", C7: "RhodesMK1_C7_60.mp3",
    "C#2": "RhodesMK1_Cs2_70.mp3", "C#3": "RhodesMK1_Cs3_60.mp3", "C#4": "RhodesMK1_Cs4_60.mp3",
    "C#5": "RhodesMK1_Cs5_70.mp3", "C#6": "RhodesMK1_Cs6_60.mp3", "C#7": "RhodesMK1_Cs7_60.mp3",
    D2: "RhodesMK1_D2_70.mp3", D3: "RhodesMK1_D3_60.mp3", D4: "RhodesMK1_D4_60.mp3",
    D5: "RhodesMK1_D5_70.mp3", D6: "RhodesMK1_D6_60.mp3", D7: "RhodesMK1_D7_60.mp3",
    "D#2": "RhodesMK1_Ds2_60.mp3", "D#3": "RhodesMK1_Ds3_70.mp3", "D#4": "RhodesMK1_Ds4_60.mp3",
    "D#5": "RhodesMK1_Ds5_60.mp3", "D#6": "RhodesMK1_Ds6_60.mp3", "D#7": "RhodesMK1_Ds7_60.mp3",
    E1: "RhodesMK1_E1_60.mp3", E3: "RhodesMK1_E3_70.mp3", E4: "RhodesMK1_E4_60.mp3",
    E5: "RhodesMK1_E5_60.mp3", E6: "RhodesMK1_E6_60.mp3", E7: "RhodesMK1_E7_70.mp3",
    F1: "RhodesMK1_F1_60.mp3", F2: "RhodesMK1_F2_70.mp3", F3: "RhodesMK1_F3_60.mp3",
    F4: "RhodesMK1_F4_60.mp3", F5: "RhodesMK1_F5_70.mp3", F6: "RhodesMK1_F6_60.mp3",
    "F#1": "RhodesMK1_Fs1_60.mp3", "F#2": "RhodesMK1_Fs2_70.mp3", "F#3": "RhodesMK1_Fs3_70.mp3",
    "F#4": "RhodesMK1_Fs4_60.mp3", "F#5": "RhodesMK1_Fs5_70.mp3", "F#6": "RhodesMK1_Fs6_60.mp3",
    G1: "RhodesMK1_G1_60.mp3", G2: "RhodesMK1_G2_70.mp3", G3: "RhodesMK1_G3_70.mp3",
    G4: "RhodesMK1_G4_80.mp3", G5: "RhodesMK1_G5_60.mp3", G6: "RhodesMK1_G6_60.mp3",
    "G#1": "RhodesMK1_Gs1_60.mp3", "G#2": "RhodesMK1_Gs2_60.mp3", "G#3": "RhodesMK1_Gs3_60.mp3",
    "G#4": "RhodesMK1_Gs4_60.mp3", "G#5": "RhodesMK1_Gs5_60.mp3", "G#6": "RhodesMK1_Gs6_70.mp3",
  };

  const keys = generateKeys('E1', 'E7');
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  let sampler: Tone.Sampler | null = null;
  let reverb: Tone.Reverb | null = null;
  let samplesLoaded = $state(false);
  let isLoadingSamples = $state(false);
  let notesPlaying = $state<string[]>([]);
  let isDragging = $state(false);
  let isSustaining = $state(false);
  let sustainedNotes = $state<string[]>([]);

  async function init() {
    if (sampler) return;
    isLoadingSamples = true;
    await Tone.start();
    const ctx = Tone.getContext();
    if (!ctx.disposed) ctx.dispose();
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 }));
    Tone.getContext().transport.bpm.value = 100;
    Tone.getDestination().volume.value = 0;

    reverb = new Tone.Reverb({ wet: 0.4, decay: 2, preDelay: 0.2 }).toDestination();

    const encodedUrls: Record<string, string> = {};
    for (const [k, v] of Object.entries(RHODES_URLS)) {
      encodedUrls[k] = encodeURIComponent(v);
    }

    return new Promise<void>((resolve, reject) => {
      sampler = new Tone.Sampler({
        context: Tone.getContext(),
        urls: encodedUrls,
        baseUrl: `${base}/audio/rhodes/`,
        volume: 10,
        onload: () => {
          isLoadingSamples = false;
          samplesLoaded = true;
          resolve();
        },
        onerror: (err) => {
          console.error(err);
          reject(err);
        },
      }).connect(reverb!);
    });
  }

  function noteDown(note: string) {
    if (!sampler) {
      init();
      return;
    }
    if (samplesLoaded) {
      sampler.triggerAttack(note, Tone.now());
      notesPlaying = [...notesPlaying, note];
    }
  }

  function noteUp(note: string) {
    if (!sampler || !samplesLoaded) return;
    if (isSustaining) {
      if (!sustainedNotes.includes(note)) {
        sustainedNotes = [...sustainedNotes, note];
      }
    } else {
      sampler.triggerRelease(note);
      notesPlaying = notesPlaying.filter(n => n !== note);
    }
  }

  function onStopDrag() {
    sampler?.releaseAll('+3');
    isDragging = false;
    notesPlaying = [];
  }

  // --- Public API for playback.ts ---
  export function getSampler(): Tone.Sampler | null {
    return sampler;
  }

  export async function ensureReady(): Promise<void> {
    if (!sampler) await init();
  }

  export function sustainOn() {
    isSustaining = true;
    sustainedNotes = [...notesPlaying];
  }

  export function sustainOff() {
    isSustaining = false;
    const toRelease = sustainedNotes.filter(n => !notesPlaying.includes(n));
    if (sampler && toRelease.length) sampler.triggerRelease(toRelease);
    sustainedNotes = sustainedNotes.filter(n => notesPlaying.includes(n));
  }

  export function setNotesPlaying(notes: string[]) {
    notesPlaying = notes;
  }
</script>

<div class="piano-container overflow-x-auto" onmouseup={onStopDrag}>
  {#if isLoadingSamples}
    <p class="text-sm text-surface-500 text-center">Loading samples...</p>
  {/if}

  <piano
    class:loading={isLoadingSamples}
    onmouseleave={() => { isDragging = false; }}
  >
    <div class="white-keys">
      {#each whiteKeys as wk}
        <div
          class="white-key"
          class:playing={notesPlaying.includes(wk.key)}
          class:sustained={sustainedNotes.includes(wk.key)}
          onmousedown={() => { noteDown(wk.key); isDragging = true; }}
          onmouseup={() => { noteUp(wk.key); onStopDrag(); }}
          onmouseenter={() => { if (isDragging) noteDown(wk.key); }}
        ></div>
      {/each}
    </div>
    <div class="black-keys">
      {#each blackKeys as bk}
        <div
          class="black-key"
          class:playing={notesPlaying.includes(bk.key)}
          class:sustained={sustainedNotes.includes(bk.key)}
          style="left: {bk.x}px;"
          onmousedown={() => { noteDown(bk.key); isDragging = true; }}
          onmouseup={() => { noteUp(bk.key); onStopDrag(); }}
          onmouseenter={() => { if (isDragging) noteDown(bk.key); }}
        ></div>
      {/each}
    </div>
  </piano>
</div>

<style>
  .piano-container {
    display: block;
    width: 100%;
    position: relative;
    max-width: 100%;
  }

  piano {
    min-height: 100px;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: flex-start;
    margin: 0 auto;
    position: relative;
    width: fit-content;
    pointer-events: auto;
    box-sizing: border-box;
  }

  piano.loading {
    opacity: 0.5;
    pointer-events: none;
  }

  piano .black-keys {
    position: absolute;
    top: -10px;
    height: 75px;
  }

  piano .white-keys {
    position: relative;
    display: flex;
    flex-direction: row;
    height: 100px;
  }

  piano .white-key {
    position: relative;
    width: 20px;
    margin: 0 2px;
    box-sizing: border-box;
    height: 100%;
    border: 1px inset rgb(156, 156, 156);
    border-radius: 4px;
    background-color: light-dark(white, rgba(102, 99, 99, 0.43));
    pointer-events: auto;
  }

  piano .white-key.playing {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }

  piano .white-key.sustained {
    background-color: rgb(144, 84, 77);
  }

  piano .white-key:hover {
    background-color: light-dark(#ddd, rgba(140, 140, 140, 0.5));
  }

  piano .white-key:active {
    background-color: rgb(240, 41, 93);
    transform: translateY(2px);
  }

  piano .black-key {
    z-index: 1;
    position: absolute;
    width: 16px;
    height: 100%;
    border: 1px inset rgb(92, 88, 88);
    background: rgb(20, 20, 20);
    border-radius: 3px;
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.47);
  }

  piano .black-key.playing {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }

  piano .black-key.sustained {
    background-color: rgb(144, 84, 77);
  }

  piano .black-key:hover {
    background-color: rgb(60, 60, 60);
  }

  piano .black-key:active {
    background-color: rgb(240, 41, 93);
    transform: translateY(2px);
  }
</style>
```

**Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/Piano.svelte
git commit -m "feat: add Piano component with Tone.js sampler"
```

---

### Task 4: Create playback.ts with voicing and sequence logic

**Files:**
- Create: `src/lib/playback.ts`
- Create: `src/lib/playback.test.ts`

**Step 1: Write the tests**

Create `src/lib/playback.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getClosedVoicing, stepChordInScale } from './playback';

describe('getClosedVoicing', () => {
  it('voices notes upward from root within one octave', () => {
    const voicing = getClosedVoicing('Db', ['Db', 'E', 'G', 'Bb'], 4);
    expect(voicing).toEqual(['Db4', 'E4', 'G4', 'Bb4']);
  });

  it('wraps notes above the root', () => {
    const voicing = getClosedVoicing('G', ['Db', 'E', 'G', 'Bb'], 4);
    expect(voicing).toEqual(['G4', 'Bb4', 'Db5', 'E5']);
  });

  it('handles single note', () => {
    const voicing = getClosedVoicing('C', ['C'], 4);
    expect(voicing).toEqual(['C4']);
  });
});

describe('stepChordInScale', () => {
  // C6 Diminished: C, D, E, F, G, Ab, A, B
  const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'Ab', 'A', 'B'];

  it('steps chord down one scale degree', () => {
    const result = stepChordInScale(['C', 'E', 'G'], scaleNotes, -1);
    expect(result).toEqual(['B', 'D', 'F']);
  });

  it('steps chord up one scale degree', () => {
    const result = stepChordInScale(['C', 'E', 'G'], scaleNotes, 1);
    expect(result).toEqual(['D', 'F', 'Ab']);
  });

  it('wraps around scale boundary going down', () => {
    const result = stepChordInScale(['C'], scaleNotes, -1);
    expect(result).toEqual(['B']);
  });

  it('wraps around scale boundary going up', () => {
    const result = stepChordInScale(['B'], scaleNotes, 1);
    expect(result).toEqual(['C']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/playback.test.ts`
Expected: FAIL — module not found

**Step 3: Implement playback.ts**

Create `src/lib/playback.ts`:

```typescript
import * as Tone from 'tone';
import { Note, Chord } from 'tonal';

/**
 * Build a closed voicing: order notes upward from root within one octave.
 */
export function getClosedVoicing(root: string, notes: string[], octave: number): string[] {
  const rootChroma = Note.chroma(root);
  if (rootChroma === undefined) return [];

  const sorted = [...notes].sort((a, b) => {
    const aChroma = Note.chroma(a)!;
    const bChroma = Note.chroma(b)!;
    const aDist = (aChroma - rootChroma + 12) % 12;
    const bDist = (bChroma - rootChroma + 12) % 12;
    return aDist - bDist;
  });

  const result: string[] = [];
  let currentOctave = octave;
  let prevSemitone = -1;

  for (const note of sorted) {
    const chroma = Note.chroma(note)!;
    const semitone = (chroma - rootChroma + 12) % 12;
    if (semitone < prevSemitone) currentOctave++;
    prevSemitone = semitone;
    result.push(note + currentOctave);
  }

  return result;
}

/**
 * Move each chord tone up or down by `steps` within the given scale.
 */
export function stepChordInScale(chordNotes: string[], scaleNotes: string[], steps: number): string[] {
  return chordNotes.map(note => {
    const idx = scaleNotes.indexOf(note);
    if (idx === -1) return note;
    const newIdx = ((idx + steps) % scaleNotes.length + scaleNotes.length) % scaleNotes.length;
    return scaleNotes[newIdx];
  });
}

/**
 * Get the tonic chord for a key. Major keys get major triad, minor get minor triad.
 */
export function getTonicChord(root: string, quality: string): string[] {
  const isMinor = quality === 'minor' || quality.includes('minor');
  const chordName = isMinor ? root + 'm' : root;
  const chord = Chord.get(chordName);
  return chord.notes.length > 0 ? chord.notes : [root];
}

export type SequenceParams = {
  sampler: Tone.Sampler;
  tonicRoot: string;
  tonicChordNotes: string[];
  targetRoot: string;
  targetChordNotes: string[];
  scaleNotes: string[];
  octave?: number;
  bpm?: number;
  onNotesChange?: (notes: string[]) => void;
  onSustainOn?: () => void;
  onSustainOff?: () => void;
};

/**
 * Play the 8-beat sequence:
 * tonic(2) → target(2) → step-down(1) → step-up(1) → target(2)
 * Bass note: tonic root below for beats 1-2, target root below for beats 3-8.
 */
export function playSequence(params: SequenceParams): void {
  const {
    sampler,
    tonicRoot,
    tonicChordNotes,
    targetRoot,
    targetChordNotes,
    scaleNotes,
    octave = 4,
    onNotesChange,
    onSustainOn,
    onSustainOff,
  } = params;

  const transport = Tone.getTransport();
  transport.cancel();
  transport.stop();
  transport.position = 0;

  const tonicVoicing = getClosedVoicing(tonicRoot, tonicChordNotes, octave);
  const tonicBass = tonicRoot + (octave - 1);
  const targetVoicing = getClosedVoicing(targetRoot, targetChordNotes, octave);
  const targetBass = targetRoot + (octave - 1);

  const stepDownNotes = stepChordInScale(targetChordNotes, scaleNotes, -1);
  const stepUpNotes = stepChordInScale(targetChordNotes, scaleNotes, 1);
  const stepDownVoicing = getClosedVoicing(targetRoot, stepDownNotes, octave);
  const stepUpVoicing = getClosedVoicing(targetRoot, stepUpNotes, octave);

  // Schedule: each beat = "0:1" in transport time (one quarter note)
  const chords: { time: string; notes: string[]; bass: string; duration: string }[] = [
    { time: '0:0', notes: tonicVoicing, bass: tonicBass, duration: '0:2' },
    { time: '0:2', notes: targetVoicing, bass: targetBass, duration: '0:2' },
    { time: '1:0', notes: stepDownVoicing, bass: targetBass, duration: '0:1' },
    { time: '1:1', notes: stepUpVoicing, bass: targetBass, duration: '0:1' },
    { time: '1:2', notes: targetVoicing, bass: targetBass, duration: '0:2' },
  ];

  for (const chord of chords) {
    const allNotes = [...chord.notes, chord.bass];

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerAttack(allNotes, time);
      onSustainOn?.();
      Tone.Draw.schedule(() => {
        onNotesChange?.(allNotes);
      }, time);
    }, chord.time);

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerRelease(allNotes, time);
      Tone.Draw.schedule(() => {
        onNotesChange?.([]);
      }, time);
    }, Tone.Time(chord.time).toSeconds() + Tone.Time(chord.duration).toSeconds());
  }

  // Stop transport after sequence ends (2 bars)
  transport.schedule(() => {
    transport.stop();
    onNotesChange?.([]);
  }, '2:0');

  transport.start();
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/playback.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/lib/playback.ts src/lib/playback.test.ts
git commit -m "feat: add playback sequence and voicing logic"
```

---

### Task 5: Add target root note selection (double-click/long-press)

**Files:**
- Modify: `src/routes/+page.svelte` (script section only)

**Step 1: Add targetRoot state and handlers**

In the script section of `+page.svelte`, after the `clearSelection` function (line 36), add:

```typescript
  // --- Target root note ---
  let targetRoot = $state<string | null>(null);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  function handleTargetDblClick(note: string) {
    if (!selectedNotes.has(note)) {
      const next = new Set(selectedNotes);
      next.add(note);
      selectedNotes = next;
    }
    targetRoot = targetRoot === note ? null : note;
  }

  function handleTargetPointerDown(note: string) {
    longPressTimer = setTimeout(() => {
      handleTargetDblClick(note);
      longPressTimer = null;
    }, 300);
  }

  function handleTargetPointerUp() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
```

Also update `clearSelection` to reset `targetRoot`:

Change:
```typescript
  function clearSelection() {
    selectedNotes = new Set();
  }
```
To:
```typescript
  function clearSelection() {
    selectedNotes = new Set();
    targetRoot = null;
  }
```

And in `toggleNote`, reset `targetRoot` if the root note is deselected:

Change:
```typescript
  function toggleNote(note: string) {
    const next = new Set(selectedNotes);
    if (next.has(note)) {
      next.delete(note);
    } else {
      next.add(note);
    }
    selectedNotes = next;
  }
```
To:
```typescript
  function toggleNote(note: string) {
    const next = new Set(selectedNotes);
    if (next.has(note)) {
      next.delete(note);
      if (targetRoot === note) targetRoot = null;
    } else {
      next.add(note);
    }
    selectedNotes = next;
  }
```

**Step 2: Update target note chip markup**

In the template, replace the target note button (around line 242-252):

From:
```svelte
        <button
          class="chip font-mono {selectedNotes.has(note)
            ? ''
            : 'preset-outlined-surface-500'}"
          style={selectedNotes.has(note)
            ? `background-color: ${DIM7_COLORS[note]}; color: var(--color-surface-950);`
            : ''}
          onclick={() => toggleNote(note)}
        >
```

To:
```svelte
        <button
          class="chip font-mono {selectedNotes.has(note)
            ? ''
            : 'preset-outlined-surface-500'}"
          style="{selectedNotes.has(note)
            ? `background-color: ${DIM7_COLORS[note]}; color: var(--color-surface-950);`
            : ''}{targetRoot === note
            ? ' border: 3px solid light-dark(var(--color-surface-950), var(--color-surface-50));'
            : ''}"
          onclick={() => toggleNote(note)}
          ondblclick={() => handleTargetDblClick(note)}
          onpointerdown={() => handleTargetPointerDown(note)}
          onpointerup={handleTargetPointerUp}
          onpointercancel={handleTargetPointerUp}
        >
```

**Step 3: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add target root note selection via double-click/long-press"
```

---

### Task 6: Integrate Piano and play buttons into the page

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add Piano import and play handler to script section**

At the top of the script, add imports:

```typescript
  import Piano from '$lib/Piano.svelte';
  import { playSequence, getTonicChord, getClosedVoicing, stepChordInScale } from '$lib/playback';
  import { Pcset, Scale, Note, Chord } from 'tonal';
```

(Replace the existing `import { Pcset, Scale } from 'tonal';` line.)

Add a `piano` binding and play handler at the end of the script section (before `</script>`):

```typescript
  let piano: Piano;

  async function handlePlay(scale: { name: string; chroma: string; root: string }) {
    if (!selectedKey || !targetRoot) return;
    await piano.ensureReady();
    const sampler = piano.getSampler();
    if (!sampler) return;

    const scaleNotes = Pcset.notes(scale.chroma);
    const tonicChordNotes = getTonicChord(selectedKey.notes[0], selectedQuality!);

    playSequence({
      sampler,
      tonicRoot: selectedKey.notes[0],
      tonicChordNotes,
      targetRoot,
      targetChordNotes: [...selectedNotes],
      scaleNotes,
      onNotesChange: (notes) => piano.setNotesPlaying(notes),
      onSustainOn: () => piano.sustainOn(),
      onSustainOff: () => piano.sustainOff(),
    });
  }
```

**Step 2: Add Piano component to template**

After the ScaleDiagram section (after `</div>` for the scale diagram around line 271), add:

```svelte
  <!-- Piano -->
  <div class="mb-6">
    <Piano bind:this={piano} />
  </div>
```

**Step 3: Add play buttons to scale cards**

In the overlap-grouped card (the one inside `{#if selectedKey}`), add a play button in the card header. Change:

```svelte
            <div class="card preset-outlined-surface-200-800 p-3">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-medium">{scale.name}</span>
                <span class="text-xs text-surface-400">{group.overlap}/{selectedKey.notes.length}</span>
              </div>
```

To:

```svelte
            <div class="card preset-outlined-surface-200-800 p-3">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-medium">{scale.name}</span>
                <span class="text-xs text-surface-400">{group.overlap}/{selectedKey.notes.length}</span>
                <button
                  class="btn-icon btn-icon-sm preset-tonal-primary ml-auto"
                  disabled={!selectedKey || !targetRoot}
                  onclick={() => handlePlay(scale)}
                  title="Play sequence"
                >&#9654;</button>
              </div>
```

In the type-grouped card (the `{:else}` branch), add the same play button. Change:

```svelte
              <div class="card preset-outlined-surface-200-800 p-3">
                <div class="font-medium mb-1">{scale.name}</div>
```

To:

```svelte
              <div class="card preset-outlined-surface-200-800 p-3">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="font-medium">{scale.name}</span>
                  <button
                    class="btn-icon btn-icon-sm preset-tonal-primary ml-auto"
                    disabled={!selectedKey || !targetRoot}
                    onclick={() => handlePlay(scale)}
                    title="Play sequence"
                  >&#9654;</button>
                </div>
```

**Step 4: Verify it builds**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: integrate Piano component and play buttons into page"
```

---

### Task 7: Final verification and docs commit

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit docs**

```bash
git add docs/plans/
git commit -m "docs: add piano playback implementation plan"
```
