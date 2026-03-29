import { describe, it, expect } from 'vitest';
import { filterScales, countKeyOverlap } from './filter';
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

describe('countKeyOverlap', () => {
  it('returns 7 when key is fully contained in scale', () => {
    // C major notes: C D E F G A B — chroma 101011010101
    // C Maj6 Dim:    C D E F G Ab A B — chroma 101011011101
    // All 7 C major notes are in C Maj6 Dim
    const cMaj6 = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
    expect(countKeyOverlap('101011010101', cMaj6.chroma)).toBe(7);
  });

  it('returns 0 when no overlap', () => {
    // key chroma with only C# Eb Gb Bb = 010100100010
    // scale with only C D E F G Ab A B = 101011011101
    // These are complementary — no positions share a 1
    expect(countKeyOverlap('010100100010', '101011011101')).toBe(0);
  });

  it('returns correct partial overlap', () => {
    // C major: 101011010101
    // Just C E G = 100010010000
    expect(countKeyOverlap('101011010101', '100010010000')).toBe(3);
  });
});
