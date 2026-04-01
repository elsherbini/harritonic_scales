import { describe, it, expect } from 'vitest';
import { noteToAbc, scaleToAbc, sequenceToAbc, makeDimAbc } from './abc';

describe('noteToAbc', () => {
  it('converts natural notes in octave 4 to uppercase with = prefix', () => {
    expect(noteToAbc('C4')).toBe('=C');
    expect(noteToAbc('G4')).toBe('=G');
    expect(noteToAbc('B4')).toBe('=B');
  });

  it('converts notes in octave 5 to lowercase with = prefix', () => {
    expect(noteToAbc('C5')).toBe('=c');
    expect(noteToAbc('E5')).toBe('=e');
  });

  it('converts notes in octave 3 with = prefix and comma', () => {
    expect(noteToAbc('C3')).toBe('=C,');
    expect(noteToAbc('G3')).toBe('=G,');
  });

  it('converts notes in octave 6 with = prefix and apostrophe', () => {
    expect(noteToAbc('C6')).toBe("=c'");
    expect(noteToAbc('D6')).toBe("=d'");
  });

  it('converts notes in octave 2 with = prefix and double comma', () => {
    expect(noteToAbc('C2')).toBe('=C,,');
  });

  it('converts notes in octave 7 with = prefix and double apostrophe', () => {
    expect(noteToAbc('C7')).toBe("=c''");
  });

  it('converts sharps with ^ prefix', () => {
    expect(noteToAbc('F#4')).toBe('^F');
    expect(noteToAbc('C#5')).toBe('^c');
  });

  it('converts flats with _ prefix', () => {
    expect(noteToAbc('Bb4')).toBe('_B');
    expect(noteToAbc('Db3')).toBe('_D,');
    expect(noteToAbc('Eb5')).toBe('_e');
  });
});

describe('scaleToAbc', () => {
  it('generates ABC for C major ascending scale (no accidentals needed)', () => {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('K:C');
    // All naturals in C major key sig — no prefixes needed
    expect(abc).toContain('CDEFGABc');
  });

  it('generates ABC for D dorian with correct key sig (no accidentals needed)', () => {
    const notes = ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'];
    const abc = scaleToAbc(notes, 'D', 'dorian');
    expect(abc).toContain('K:DDor');
    // D dorian = C major notes, all in key sig
    expect(abc).toContain('DEFGABcd');
  });

  it('generates ABC for A harmonic minor with raised 7th accidental', () => {
    const notes = ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4'];
    const abc = scaleToAbc(notes, 'A', 'harmonic minor');
    expect(abc).toContain('K:Am');
    // G# not in A minor key sig, needs ^
    expect(abc).toContain('^G');
  });

  it('includes L:1/4 for quarter note default length', () => {
    const notes = ['C4', 'D4', 'E4'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('L:1/4');
  });

  it('cancels carry-through with = when needed', () => {
    // Bb then B natural in C major — _B then =B
    const notes = ['Bb4', 'B4'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('_B=B');
  });

  it('does not repeat same accidental for same staff position', () => {
    // Two Bb4s — only first needs _ (same staff position)
    const notes = ['Bb4', 'Bb4'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('_BB');
  });

  it('repeats accidental for different octaves', () => {
    // Bb3 and Bb4 are different staff positions — both need _
    const notes = ['Bb3', 'Bb4'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('_B,_B');
  });
});

describe('sequenceToAbc', () => {
  it('generates stacked chords in brackets', () => {
    const chords = [['C4', 'E4', 'G4'], ['D4', 'F4', 'A4']];
    const abc = sequenceToAbc(chords, 'C', 'major');
    // All naturals in C major — no prefixes
    expect(abc).toContain('[CEG]');
    expect(abc).toContain('[DFA]');
  });

  it('includes key signature', () => {
    const chords = [['C4', 'E4', 'G4']];
    const abc = sequenceToAbc(chords, 'C', 'major');
    expect(abc).toContain('K:C');
  });

  it('handles accidentals in chords', () => {
    // Bb major key sig has Bb and Eb
    // Db and Ab are NOT in key sig — need explicit _ prefix
    // E natural is NOT in key sig (Eb is) — needs = prefix
    const chords = [['Db3', 'E3', 'Ab3', 'Bb3']];
    const abc = sequenceToAbc(chords, 'Bb', 'major');
    expect(abc).toContain('_D,');
    expect(abc).toContain('=E,');
    expect(abc).toContain('_A,');
    // Bb is in the key sig, no prefix needed
    expect(abc).toMatch(/[^_=^]B,/);
  });

  it('tracks accidentals across chords within the bar', () => {
    // First chord sets _B, second chord has B natural — needs =B
    const chords = [['Bb4'], ['B4']];
    const abc = sequenceToAbc(chords, 'C', 'major');
    expect(abc).toContain('[_B]');
    expect(abc).toContain('[=B]');
  });
});

describe('makeDimAbc', () => {
  it('replaces treble clef with diminished', () => {
    const abc = 'X:1\nL:1/4\nK:C clef=treble\nCDEF';
    const result = makeDimAbc(abc);
    expect(result).toContain('clef=diminished');
    expect(result).not.toContain('clef=treble');
  });

  it('replaces K: line clefs', () => {
    const abc = 'X:1\nK:DDor clef=treble\nDEFG';
    const result = makeDimAbc(abc);
    expect(result).toContain('clef=diminished');
  });

  it('preserves note content', () => {
    const abc = 'X:1\nL:1/4\nK:C clef=treble\nCDEF';
    const result = makeDimAbc(abc);
    expect(result).toContain('CDEF');
  });

  it('strips octave overrides', () => {
    const abc = 'X:1\nK:C clef=treble octave=-1\nCDEF';
    const result = makeDimAbc(abc);
    expect(result).not.toContain('octave=');
  });
});
