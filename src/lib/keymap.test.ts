import { describe, it, expect } from 'vitest';
import { generateKeys } from './keymap';

describe('generateKeys', () => {
  it('generates keys from E1 to E7', () => {
    const keys = generateKeys('E1', 'E7');
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0].key).toBe('E1');
    expect(keys[keys.length - 1].key).toBe('E7');
  });

  it('marks black keys correctly', () => {
    const keys = generateKeys('C4', 'C5');
    const cSharp = keys.find(k => k.key === 'C#4');
    const d = keys.find(k => k.key === 'D4');
    expect(cSharp?.isBlack).toBe(true);
    expect(d?.isBlack).toBe(false);
  });

  it('assigns MIDI values', () => {
    const keys = generateKeys('C4', 'C5');
    const c4 = keys.find(k => k.key === 'C4');
    expect(c4?.midi).toBe(60);
  });

  it('positions white keys sequentially', () => {
    const keys = generateKeys('C4', 'E4');
    const whiteKeys = keys.filter(k => !k.isBlack);
    for (let i = 1; i < whiteKeys.length; i++) {
      expect(whiteKeys[i].x).toBeGreaterThan(whiteKeys[i - 1].x);
    }
  });
});
