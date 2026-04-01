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

  // ABC accidental prefix — always explicit to prevent carry-through
  let accPrefix = '='; // natural by default
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
 * Get the ABC staff position key for a note. In ABC (and standard notation),
 * accidentals only carry through for the same staff position — e.g. _E (Eb4)
 * does NOT carry to e (E5). We track by the ABC letter+octave representation.
 */
function abcStaffPosition(letter: string, oct: number): string {
  if (oct <= 4) {
    return letter.toUpperCase() + ','.repeat(Math.max(0, 4 - oct));
  }
  return letter.toLowerCase() + "'".repeat(Math.max(0, oct - 5));
}

/**
 * Initialize a tracker of "active" accidentals from a key signature.
 * Returns a Map keyed by staff position and a default accidental map
 * from the key signature (keyed by letter name, applied to any octave).
 */
function initAccidentalTracker(keySigNotes: Set<string>): { overrides: Map<string, string>; keySigAccidentals: Map<string, string> } {
  const keySigAccidentals = new Map<string, string>();
  for (const letter of 'ABCDEFG') {
    keySigAccidentals.set(letter, '');
  }
  for (const pc of keySigNotes) {
    keySigAccidentals.set(pc[0], pc.slice(1));
  }
  return { overrides: new Map(), keySigAccidentals };
}

/**
 * Convert a note to ABC with smart accidentals: only emit an explicit
 * accidental prefix when it differs from what's currently active for
 * that staff position (from key signature or a prior note in the bar).
 * Mutates the tracker to reflect the new active accidental.
 */
function noteToAbcTracked(note: string, tracker: { overrides: Map<string, string>; keySigAccidentals: Map<string, string> }): string {
  const pc = Note.pitchClass(note);
  const oct = Note.octave(note);
  if (pc === undefined || oct === null || oct === undefined) return '';

  const letter = pc[0];
  const accidental = pc.slice(1); // '', '#', 'b', '##', 'bb'
  const pos = abcStaffPosition(letter, oct);

  // What's active for this staff position? Check overrides first, then key sig.
  const active = tracker.overrides.has(pos)
    ? tracker.overrides.get(pos)!
    : (tracker.keySigAccidentals.get(letter) ?? '');

  let prefix = '';
  if (accidental !== active) {
    if (accidental === '#') prefix = '^';
    else if (accidental === '##') prefix = '^^';
    else if (accidental === 'b') prefix = '_';
    else if (accidental === 'bb') prefix = '__';
    else prefix = '='; // natural, cancelling a prior accidental
    tracker.overrides.set(pos, accidental);
  }

  return prefix + pos;
}

/**
 * Generate ABC notation for a scale displayed as an ascending run.
 * Uses smart accidental tracking to avoid cluttering the staff.
 */
export function scaleToAbc(notes: string[], root: string, mode: string | null): string {
  const { keyLine, keySigNotes } = mode ? getAbcKey(root, mode) : { keyLine: 'K:C clef=treble', keySigNotes: new Set<string>() };
  const tracker = initAccidentalTracker(keySigNotes);
  const abcNotes = notes.map(n => noteToAbcTracked(n, tracker)).join('');

  return `X:1\nL:1/4\n${keyLine}${keyLine.includes('clef=') ? '' : ' clef=treble'}\n${abcNotes}`;
}

/**
 * Generate ABC notation for a chord sequence (each chord is an array of notes).
 * Chords are rendered as stacked notes in brackets: [CEG][DFA]
 * Uses octave-aware accidental tracking across all chords (single bar).
 */
export function sequenceToAbc(chords: string[][], root: string, mode: string): string {
  const { keyLine, keySigNotes } = getAbcKey(root, mode);
  const tracker = initAccidentalTracker(keySigNotes);
  const abcChords = chords.map(chord => {
    const notes = chord.map(n => noteToAbcTracked(n, tracker)).join('');
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
