import { describe, it, expect } from 'vitest';
import { noteToAbc, scaleToAbc, sequenceToAbc, makeDimAbc } from './abc';

describe('noteToAbc', () => {
  it('converts natural notes in octave 4 to uppercase', () => {
    expect(noteToAbc('C4')).toBe('C');
    expect(noteToAbc('G4')).toBe('G');
    expect(noteToAbc('B4')).toBe('B');
  });

  it('converts notes in octave 5 to lowercase', () => {
    expect(noteToAbc('C5')).toBe('c');
    expect(noteToAbc('E5')).toBe('e');
  });

  it('converts notes in octave 3 with comma', () => {
    expect(noteToAbc('C3')).toBe('C,');
    expect(noteToAbc('G3')).toBe('G,');
  });

  it('converts notes in octave 6 with apostrophe', () => {
    expect(noteToAbc('C6')).toBe("c'");
    expect(noteToAbc('D6')).toBe("d'");
  });

  it('converts notes in octave 2 with double comma', () => {
    expect(noteToAbc('C2')).toBe('C,,');
  });

  it('converts notes in octave 7 with double apostrophe', () => {
    expect(noteToAbc('C7')).toBe("c''");
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
  it('generates ABC for C major ascending scale', () => {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('K:C');
    expect(abc).toContain('CDEFGABc');
  });

  it('generates ABC for D dorian with correct key sig', () => {
    const notes = ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'];
    const abc = scaleToAbc(notes, 'D', 'dorian');
    expect(abc).toContain('K:DDor');
    expect(abc).toContain('DEFGABcd');
  });

  it('generates ABC for A harmonic minor with raised 7th accidental', () => {
    const notes = ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G#4', 'A4'];
    const abc = scaleToAbc(notes, 'A', 'harmonic minor');
    expect(abc).toContain('K:Am');
    expect(abc).toContain('^G');
  });

  it('includes L:1/4 for quarter note default length', () => {
    const notes = ['C4', 'D4', 'E4'];
    const abc = scaleToAbc(notes, 'C', 'major');
    expect(abc).toContain('L:1/4');
  });
});

describe('sequenceToAbc', () => {
  it('generates stacked chords in brackets', () => {
    const chords = [['C4', 'E4', 'G4'], ['D4', 'F4', 'A4']];
    const abc = sequenceToAbc(chords, 'C', 'major');
    expect(abc).toContain('[CEG]');
    expect(abc).toContain('[DFA]');
  });

  it('includes key signature', () => {
    const chords = [['C4', 'E4', 'G4']];
    const abc = sequenceToAbc(chords, 'C', 'major');
    expect(abc).toContain('K:C');
  });

  it('handles accidentals in chords', () => {
    const chords = [['Db3', 'E3', 'Ab3', 'Bb3']];
    const abc = sequenceToAbc(chords, 'Bb', 'major');
    expect(abc).toContain('[');
    expect(abc).toContain(']');
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
