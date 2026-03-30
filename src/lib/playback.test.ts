import { describe, it, expect } from 'vitest';
import { getClosedVoicing, stepChordInScale, getTonicChord } from './playback';

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

describe('getTonicChord', () => {
  it('returns major triad for major quality', () => {
    expect(getTonicChord('C', 'major')).toEqual(['C', 'E', 'G']);
  });

  it('returns minor triad for minor quality', () => {
    expect(getTonicChord('A', 'minor')).toEqual(['A', 'C', 'E']);
  });

  it('returns minor triad for qualities containing "minor"', () => {
    expect(getTonicChord('D', 'harmonic minor')).toEqual(['D', 'F', 'A']);
  });
});
