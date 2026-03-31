import { Note, Scale } from 'tonal';

/**
 * Convert a note like "Db4" to ABC pitch notation like "_D".
 */
export function noteToAbc(note: string): string {
  const pc = Note.pitchClass(note);
  const oct = Note.octave(note);
  if (pc === undefined || oct === null || oct === undefined) return '';

  // Extract letter and accidental
  const letter = pc[0];
  const accidental = pc.slice(1); // '', '#', 'b', '##', 'bb'

  // ABC accidental prefix
  let accPrefix = '';
  if (accidental === '#') accPrefix = '^';
  else if (accidental === '##') accPrefix = '^^';
  else if (accidental === 'b') accPrefix = '_';
  else if (accidental === 'bb') accPrefix = '__';

  // Octave 4 = uppercase, octave 5 = lowercase
  let abcLetter: string;
  let octaveMark = '';

  if (oct <= 4) {
    abcLetter = letter.toUpperCase();
    // Each octave below 4 adds a comma
    for (let i = 0; i < 4 - oct; i++) octaveMark += ',';
  } else {
    abcLetter = letter.toLowerCase();
    // Each octave above 5 adds an apostrophe
    for (let i = 0; i < oct - 5; i++) octaveMark += "'";
  }

  return accPrefix + abcLetter + octaveMark;
}

/**
 * Map a tonal.js mode name to ABC key signature syntax.
 */
export function getAbcKey(root: string, mode: string): { keyLine: string; keySigNotes: Set<string> } {
  const abcModes: Record<string, string> = {
    'major': '', 'ionian': 'Ion',
    'dorian': 'Dor', 'phrygian': 'Phr',
    'lydian': 'Lyd', 'mixolydian': 'Mix',
    'minor': 'm', 'aeolian': 'Aeo', 'locrian': 'Loc',
  };

  const abcMode = abcModes[mode];
  if (abcMode !== undefined) {
    const scale = Scale.get(root + ' ' + mode);
    return {
      keyLine: `K:${root}${abcMode}`,
      keySigNotes: new Set(scale.notes),
    };
  }

  // For harmonic/melodic minor modes, use closest natural minor key sig
  const HARMONIC_MINOR_MODES = Scale.modeNames('harmonic minor').map(m => m[1]);
  const MELODIC_MINOR_MODES = Scale.modeNames('melodic minor').map(m => m[1]);

  const actualScale = Scale.get(root + ' ' + mode);
  if (!actualScale.notes.length) {
    return { keyLine: 'K:C', keySigNotes: new Set() };
  }

  if (HARMONIC_MINOR_MODES.includes(mode) || MELODIC_MINOR_MODES.includes(mode)) {
    const naturalMinor = Scale.get(root + ' minor');
    if (naturalMinor.notes.length) {
      return {
        keyLine: `K:${root}m`,
        keySigNotes: new Set(naturalMinor.notes),
      };
    }
  }

  return { keyLine: 'K:C', keySigNotes: new Set() };
}

/**
 * Convert a note to ABC, adding explicit accidental only if it
 * differs from what the key signature provides.
 */
export function noteToAbcInKey(note: string, keySigNotes: Set<string>): string {
  const pc = Note.pitchClass(note);
  if (keySigNotes.has(pc)) {
    // Key signature handles the accidental -- emit just the letter + octave
    const letter = pc[0];
    const oct = Note.octave(note);
    if (oct === null) return '';

    let abcLetter: string;
    let octaveMark = '';
    if (oct <= 4) {
      abcLetter = letter.toUpperCase();
      for (let i = 0; i < 4 - oct; i++) octaveMark += ',';
    } else {
      abcLetter = letter.toLowerCase();
      for (let i = 0; i < oct - 5; i++) octaveMark += "'";
    }
    return abcLetter + octaveMark;
  }

  // Note is not in the key sig -- use full accidental notation
  return noteToAbc(note);
}

/**
 * Generate ABC notation for a scale displayed as an ascending run.
 */
export function scaleToAbc(notes: string[], root: string, mode: string | null): string {
  const { keyLine, keySigNotes } = mode ? getAbcKey(root, mode) : { keyLine: 'K:C clef=treble', keySigNotes: new Set<string>() };
  const abcNotes = notes.map(n => noteToAbcInKey(n, keySigNotes)).join('');

  return `X:1\nL:1/4\n${keyLine}${keyLine.includes('clef=') ? '' : ' clef=treble'}\n${abcNotes}`;
}

/**
 * Generate ABC notation for a chord sequence (each chord is an array of notes).
 * Chords are rendered as stacked notes in brackets: [CEG][DFA]
 */
export function sequenceToAbc(chords: string[][], root: string, mode: string): string {
  const { keyLine, keySigNotes } = getAbcKey(root, mode);
  const abcChords = chords.map(chord => {
    const notes = chord.map(n => noteToAbcInKey(n, keySigNotes)).join('');
    return `[${notes}]`;
  }).join('');

  return `X:1\nL:1/4\n${keyLine} clef=treble\n${abcChords}`;
}

/**
 * Transform ABC notation to use diminished clef instead of treble.
 * Ported from diminished_staff project.
 */
export function makeDimAbc(abc: string): string {
  return abc
    .replace(/clef=treble/g, 'clef=diminished')
    .replace(/\s+octave=-?\d+/g, '');
}
