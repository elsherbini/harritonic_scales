import { describe, it, expect } from 'vitest';
import { ALL_SCALES, type BarryHarrisScale } from './scales';

describe('ALL_SCALES', () => {
  it('has exactly 45 scales', () => {
    expect(ALL_SCALES).toHaveLength(45);
  });

  it('has 12 maj6 scales', () => {
    const maj6 = ALL_SCALES.filter(s => s.type === 'maj6');
    expect(maj6).toHaveLength(12);
  });

  it('has 12 min6 scales', () => {
    const min6 = ALL_SCALES.filter(s => s.type === 'min6');
    expect(min6).toHaveLength(12);
  });

  it('has 12 dom7 scales', () => {
    const dom7 = ALL_SCALES.filter(s => s.type === 'dom7');
    expect(dom7).toHaveLength(12);
  });

  it('has 6 dom7b5 scales', () => {
    const dom7b5 = ALL_SCALES.filter(s => s.type === 'dom7b5');
    expect(dom7b5).toHaveLength(6);
  });

  it('has 3 octatonic scales', () => {
    const oct = ALL_SCALES.filter(s => s.type === 'octatonic');
    expect(oct).toHaveLength(3);
  });

  it('each scale has 8 notes in its chroma', () => {
    for (const scale of ALL_SCALES) {
      const noteCount = scale.chroma.split('').filter(c => c === '1').length;
      expect(noteCount, `${scale.name} should have 8 notes`).toBe(8);
    }
  });

  it('all chromas are unique', () => {
    const chromas = ALL_SCALES.map(s => s.chroma);
    expect(new Set(chromas).size).toBe(45);
  });

  it('C Maj6 Diminished has correct notes', () => {
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished');
    expect(cMaj6).toBeDefined();
    // C D E F G Ab A B = positions 0,2,4,5,7,8,9,11
    expect(cMaj6!.chroma).toBe('101011011101');
  });

  it('each scale has a name, type, root, and aliases array', () => {
    for (const scale of ALL_SCALES) {
      expect(scale.name).toBeTruthy();
      expect(scale.type).toBeTruthy();
      expect(scale.root).toBeTruthy();
      expect(Array.isArray(scale.aliases)).toBe(true);
    }
  });
});
