import { describe, it, expect } from 'vitest';
import { filterScales } from './filter';
import { ALL_SCALES } from './scales';

describe('filterScales', () => {
  it('returns all 45 scales when no notes selected', () => {
    const result = filterScales(ALL_SCALES, []);
    expect(result).toHaveLength(45);
  });

  it('filters scales containing C and E', () => {
    const result = filterScales(ALL_SCALES, ['C', 'E']);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(45);
    // C Maj6 Diminished contains C and E
    expect(result.some(s => s.name === 'C Maj6 Diminished')).toBe(true);
  });

  it('returns exact match when all 8 notes selected', () => {
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
    // C Maj6 Dim notes: C D E F G Ab A B
    const result = filterScales(ALL_SCALES, ['C', 'D', 'E', 'F', 'G', 'Ab', 'A', 'B']);
    expect(result.some(s => s.chroma === cMaj6.chroma)).toBe(true);
  });

  it('returns empty when notes match no scale', () => {
    // 9 notes can't all fit in any 8-note scale
    const result = filterScales(ALL_SCALES, ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']);
    expect(result).toHaveLength(0);
  });

  it('single note C returns all scales containing C', () => {
    const result = filterScales(ALL_SCALES, ['C']);
    for (const scale of result) {
      // chroma position 0 = C, should be '1'
      expect(scale.chroma[0]).toBe('1');
    }
  });
});
