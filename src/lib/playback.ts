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

  for (const note of sorted) {
    const dist = (Note.chroma(note)! - rootChroma + 12) % 12;
    const noteOctave = rootChroma + dist >= 12 ? octave + 1 : octave;
    result.push(note + noteOctave);
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
 * Step a voiced note (e.g. 'Db4') up or down within a scale, preserving octave context.
 * Adjusts octave when the step crosses the chromatic boundary (B/C).
 */
export function stepVoicedNote(note: string, scaleNotes: string[], steps: number): string {
  const pc = Note.pitchClass(note);
  const oct = Note.octave(note);
  if (oct === null) return note;
  const idx = scaleNotes.indexOf(pc);
  if (idx === -1) return note;

  const newIdx = ((idx + steps) % scaleNotes.length + scaleNotes.length) % scaleNotes.length;
  const newPc = scaleNotes[newIdx];

  const oldChroma = Note.chroma(pc)!;
  const newChroma = Note.chroma(newPc)!;

  let newOct = oct;
  if (steps > 0 && newChroma < oldChroma) newOct++;
  if (steps < 0 && newChroma > oldChroma) newOct--;

  return newPc + newOct;
}

/**
 * Drop 2 voicing: take the 2nd highest note and drop it down an octave.
 * Only applies to chords with 4+ notes. Returns a new sorted array.
 */
export function dropTwo(voicedNotes: string[]): string[] {
  if (voicedNotes.length < 4) return voicedNotes;

  // Sort by MIDI to find 2nd highest
  const withMidi = voicedNotes.map(n => ({ name: n, midi: Note.midi(n)! }));
  withMidi.sort((a, b) => a.midi - b.midi);

  const secondHighestIdx = withMidi.length - 2;
  const dropped = withMidi[secondHighestIdx];
  const pc = Note.pitchClass(dropped.name);
  const oct = Note.octave(dropped.name)!;
  withMidi[secondHighestIdx] = { name: pc + (oct - 1), midi: dropped.midi - 12 };

  withMidi.sort((a, b) => a.midi - b.midi);
  return withMidi.map(n => n.name);
}

/**
 * Step an entire voiced chord within a scale, preserving voice leading.
 */
export function stepVoicedChord(voicedNotes: string[], scaleNotes: string[], steps: number): string[] {
  return voicedNotes.map(n => stepVoicedNote(n, scaleNotes, steps));
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
  onChordIndex?: (index: number) => void;
};

/**
 * Play the 12-beat sequence:
 * tonic(2) -> target low(2) -> walk up scale x8(4) -> target high(2) -> tonic(2)
 * Bass note: tonic root below for tonic chords, target root below for target chords.
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
    bpm,
    onNotesChange,
    onSustainOn,
    onSustainOff,
    onChordIndex,
  } = params;

  const transport = Tone.getTransport();
  transport.cancel();
  transport.stop();
  transport.position = 0;
  if (bpm != null) transport.bpm.value = bpm;

  const lowOctave = octave - 1;
  const tonicVoicing = getClosedVoicing(tonicRoot, tonicChordNotes, octave);
  const tonicBass = tonicRoot + (octave - 1);
  const targetVoicingLow = getClosedVoicing(targetRoot, targetChordNotes, lowOctave);
  const targetBass = targetRoot + (lowOctave - 1);

  // Walk up the scale: start on target, step up 7 times (8 chords total)
  const walkChords: string[][] = [targetVoicingLow];
  let current = targetVoicingLow;
  for (let i = 0; i < 7; i++) {
    current = stepVoicedChord(current, scaleNotes, 1);
    walkChords.push(current);
  }
  // One more step gives target one octave above
  const targetVoicingHigh = stepVoicedChord(current, scaleNotes, 1);

  type ChordEvent = { time: string; notes: string[]; bass: string; duration: string };
  const chords: ChordEvent[] = [
    // Bar 0: tonic(2) + target low(2)
    { time: '0:0', notes: tonicVoicing, bass: tonicBass, duration: '0:2' },
    { time: '0:2', notes: targetVoicingLow, bass: targetBass, duration: '0:2' },
  ];

  // Bar 1: walk up scale, 8 chords at half-beat (eighth note) each
  const walkTimes = [
    '1:0:0', '1:0:2', '1:1:0', '1:1:2',
    '1:2:0', '1:2:2', '1:3:0', '1:3:2',
  ];
  for (let i = 0; i < 8; i++) {
    chords.push({
      time: walkTimes[i],
      notes: walkChords[i],
      bass: targetBass,
      duration: '0:0:2',
    });
  }

  // Bar 2: target high(2) + tonic(2)
  chords.push(
    { time: '2:0', notes: targetVoicingHigh, bass: targetBass, duration: '0:2' },
    { time: '2:2', notes: tonicVoicing, bass: tonicBass, duration: '0:2' },
  );

  for (let chordIdx = 0; chordIdx < chords.length; chordIdx++) {
    const chord = chords[chordIdx];
    const allNotes = [...chord.notes, chord.bass];

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerAttack(allNotes, time);
      onSustainOn?.();
      onNotesChange?.(allNotes);
      onChordIndex?.(chordIdx);
    }, chord.time);

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerRelease(allNotes, time);
      onNotesChange?.([]);
    }, Tone.Time(chord.time).toSeconds() + Tone.Time(chord.duration).toSeconds());
  }

  // Stop transport after sequence ends (3 bars)
  transport.schedule(() => {
    transport.stop();
    onNotesChange?.([]);
    onChordIndex?.(-1);
  }, '3:0');

  transport.start();
}

export type SequenceChordsParams = {
  tonicRoot: string;
  tonicChordNotes: string[];
  targetRoot: string;
  targetChordNotes: string[];
  scaleNotes: string[];
  octave?: number;
};

/**
 * Build ascending voiced notes starting from targetRoot within the scale.
 */
function buildAscendingNotes(targetRoot: string, scaleNotes: string[], startOctave: number): string[] {
  const rootChroma = Note.chroma(targetRoot)!;
  const rootIdx = scaleNotes.findIndex(n => Note.chroma(n) === rootChroma);
  const rotated = rootIdx > 0
    ? [...scaleNotes.slice(rootIdx), ...scaleNotes.slice(0, rootIdx)]
    : [...scaleNotes];

  const notes: string[] = [];
  let oct = startOctave;
  let prevChroma = -1;
  for (const pc of rotated) {
    const chroma = Note.chroma(pc)!;
    if (prevChroma >= 0 && chroma <= prevChroma) oct++;
    notes.push(pc + oct);
    prevChroma = chroma;
  }
  return notes;
}

/**
 * Build target high voicing: closed voicing + octave of root on top.
 */
function buildTargetHighVoicing(targetRoot: string, targetChordNotes: string[], lowOctave: number, scaleNotes: string[]): string[] {
  const low = getClosedVoicing(targetRoot, targetChordNotes, lowOctave);
  // Find the root note's octave in the ascending notes to get the high root
  const ascending = buildAscendingNotes(targetRoot, scaleNotes, lowOctave);
  // Last note of the ascending scale is one octave above the first
  // But we want the root specifically one octave up
  const rootChroma = Note.chroma(targetRoot)!;
  const firstRoot = ascending.find(n => Note.chroma(n) === rootChroma);
  const firstRootOct = firstRoot ? Note.octave(firstRoot)! : lowOctave;
  const highRoot = targetRoot + (firstRootOct + 1);
  return [...low, highRoot];
}

/**
 * Play ascending scale sequence:
 * tonic(2) -> target chord(2) -> ascending scale x8(half-beats, bass held) -> target high(2) -> tonic(2)
 */
export function playAscendingScale(params: SequenceParams): void {
  const {
    sampler,
    tonicRoot,
    tonicChordNotes,
    targetRoot,
    scaleNotes,
    octave = 4,
    bpm,
    onNotesChange,
    onSustainOn,
    onSustainOff,
    onChordIndex,
  } = params;

  const transport = Tone.getTransport();
  transport.cancel();
  transport.stop();
  transport.position = 0;
  if (bpm != null) transport.bpm.value = bpm;

  const lowOctave = octave - 1;
  const tonicVoicing = getClosedVoicing(tonicRoot, tonicChordNotes, octave);
  const tonicBass = tonicRoot + (octave - 1);
  const targetVoicingLow = getClosedVoicing(targetRoot, params.targetChordNotes, lowOctave);
  const targetBass = targetRoot + (lowOctave - 1);
  const targetVoicingHigh = buildTargetHighVoicing(targetRoot, params.targetChordNotes, lowOctave, scaleNotes);

  const ascendingNotes = buildAscendingNotes(targetRoot, scaleNotes, lowOctave);

  type ChordEvent = { time: string; notes: string[]; bass: string; duration: string };
  const events: ChordEvent[] = [
    // Bar 0: tonic(2 beats) + target chord(2 beats)
    { time: '0:0', notes: tonicVoicing, bass: tonicBass, duration: '0:2' },
    { time: '0:2', notes: targetVoicingLow, bass: targetBass, duration: '0:2' },
  ];

  // Bar 1: ascending scale at half-beats (eighth notes), 8 notes
  const walkTimes = [
    '1:0:0', '1:0:2', '1:1:0', '1:1:2',
    '1:2:0', '1:2:2', '1:3:0', '1:3:2',
  ];
  for (let i = 0; i < ascendingNotes.length; i++) {
    events.push({
      time: walkTimes[i],
      notes: [ascendingNotes[i]],
      bass: targetBass,
      duration: '0:0:2',
    });
  }

  // Bar 2: target high(2 beats) + tonic(2 beats)
  events.push(
    { time: '2:0', notes: targetVoicingHigh, bass: targetBass, duration: '0:2' },
    { time: '2:2', notes: tonicVoicing, bass: tonicBass, duration: '0:2' },
  );

  // Schedule all events
  for (let eventIdx = 0; eventIdx < events.length; eventIdx++) {
    const ev = events[eventIdx];
    const allNotes = [...ev.notes, ev.bass];

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerAttack(allNotes, time);
      onSustainOn?.();
      onNotesChange?.(allNotes);
      onChordIndex?.(eventIdx);
    }, ev.time);

    transport.schedule((time) => {
      onSustainOff?.();
      sampler.triggerRelease(allNotes, time);
      onNotesChange?.([]);
    }, Tone.Time(ev.time).toSeconds() + Tone.Time(ev.duration).toSeconds());
  }

  // Stop transport after sequence ends (3 bars)
  transport.schedule(() => {
    transport.stop();
    onNotesChange?.([]);
    onChordIndex?.(-1);
  }, '3:0');

  transport.start();
}

/**
 * Get the note groups for ascending scale display on staff.
 * Returns 12 items: tonic, target low, 8 single notes, target high, tonic.
 */
export function getAscendingScaleItems(params: SequenceChordsParams): string[][] {
  const {
    tonicRoot,
    tonicChordNotes,
    targetRoot,
    targetChordNotes,
    scaleNotes,
    octave = 4,
  } = params;

  const lowOctave = octave - 1;
  const tonicVoicing = getClosedVoicing(tonicRoot, tonicChordNotes, octave);
  const targetVoicingLow = getClosedVoicing(targetRoot, targetChordNotes, lowOctave);
  const targetVoicingHigh = buildTargetHighVoicing(targetRoot, targetChordNotes, lowOctave, scaleNotes);
  const ascendingNotes = buildAscendingNotes(targetRoot, scaleNotes, lowOctave);

  return [
    tonicVoicing,
    targetVoicingLow,
    ...ascendingNotes.map(n => [n]),
    targetVoicingHigh,
    tonicVoicing,
  ];
}

export function getSequenceChords(params: SequenceChordsParams): string[][] {
  const {
    tonicRoot,
    tonicChordNotes,
    targetRoot,
    targetChordNotes,
    scaleNotes,
    octave = 4,
  } = params;

  const lowOctave = octave - 1;
  const tonicVoicing = getClosedVoicing(tonicRoot, tonicChordNotes, octave);
  const targetVoicingLow = getClosedVoicing(targetRoot, targetChordNotes, lowOctave);

  const walkChords: string[][] = [targetVoicingLow];
  let current = targetVoicingLow;
  for (let i = 0; i < 7; i++) {
    current = stepVoicedChord(current, scaleNotes, 1);
    walkChords.push(current);
  }
  const targetVoicingHigh = stepVoicedChord(current, scaleNotes, 1);

  return [
    tonicVoicing,        // bar 0: tonic
    targetVoicingLow,    // bar 0: target low
    ...walkChords,       // bar 1: 8 walk-up chords
    targetVoicingHigh,   // bar 2: target high
    tonicVoicing,        // bar 2: tonic
  ];
}
