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
 * tonic(2) -> target(2) -> step-down(1) -> step-up(1) -> target(2)
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
    bpm,
    onNotesChange,
    onSustainOn,
    onSustainOff,
  } = params;

  const transport = Tone.getTransport();
  transport.cancel();
  transport.stop();
  transport.position = 0;
  if (bpm != null) transport.bpm.value = bpm;

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
