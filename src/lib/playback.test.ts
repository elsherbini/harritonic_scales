import { describe, it, expect } from 'vitest';
import { getClosedVoicing, stepChordInScale, stepVoicedChord, dropTwo, getTonicChord, getSequenceChords } from './playback';

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

describe('stepVoicedChord', () => {
  // F min6 Diminished: C, Db, D, E, F, G, Ab, Bb
  const scaleNotes = ['C', 'Db', 'D', 'E', 'F', 'G', 'Ab', 'Bb'];

  it('steps voiced chord down preserving voice leading', () => {
    const result = stepVoicedChord(['Db4', 'E4', 'Ab4', 'Bb4'], scaleNotes, -1);
    expect(result).toEqual(['C4', 'D4', 'G4', 'Ab4']);
  });

  it('steps voiced chord up preserving voice leading', () => {
    const result = stepVoicedChord(['Db4', 'E4', 'Ab4', 'Bb4'], scaleNotes, 1);
    expect(result).toEqual(['D4', 'F4', 'Bb4', 'C5']);
  });

  it('wraps octave down when stepping below C', () => {
    const result = stepVoicedChord(['C4'], scaleNotes, -1);
    expect(result).toEqual(['Bb3']);
  });

  it('wraps octave up when stepping above B', () => {
    const result = stepVoicedChord(['Bb4'], scaleNotes, 1);
    expect(result).toEqual(['C5']);
  });
});

describe('dropTwo', () => {
  it('drops 2nd highest note down an octave', () => {
    expect(dropTwo(['Db3', 'E3', 'Ab3', 'Bb3'])).toEqual(['Ab2', 'Db3', 'E3', 'Bb3']);
  });

  it('returns unchanged for fewer than 4 notes', () => {
    expect(dropTwo(['C4', 'E4', 'G4'])).toEqual(['C4', 'E4', 'G4']);
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

describe('getSequenceChords', () => {
  it('returns 12 chord arrays', () => {
    const chords = getSequenceChords({
      tonicRoot: 'C',
      tonicChordNotes: ['C', 'E', 'G'],
      targetRoot: 'Db',
      targetChordNotes: ['Db', 'E', 'G', 'Bb'],
      scaleNotes: ['C', 'Db', 'D', 'E', 'F', 'G', 'Ab', 'Bb'],
    });
    expect(chords).toHaveLength(12);
  });

  it('starts and ends with tonic voicing', () => {
    const chords = getSequenceChords({
      tonicRoot: 'C',
      tonicChordNotes: ['C', 'E', 'G'],
      targetRoot: 'Db',
      targetChordNotes: ['Db', 'E', 'G', 'Bb'],
      scaleNotes: ['C', 'Db', 'D', 'E', 'F', 'G', 'Ab', 'Bb'],
    });
    expect(chords[0]).toEqual(chords[11]);
  });
});
