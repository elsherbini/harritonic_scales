import { describe, it, expect } from 'vitest';
import { noteToAbc } from './abc';

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
