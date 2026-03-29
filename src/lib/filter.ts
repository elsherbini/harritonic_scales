import { Pcset } from 'tonal';
import type { BarryHarrisScale } from './scales';

export function countKeyOverlap(keyChroma: string, scaleChroma: string): number {
  let count = 0;
  for (let i = 0; i < 12; i++) {
    if (keyChroma[i] === '1' && scaleChroma[i] === '1') count++;
  }
  return count;
}

export function filterScales(scales: BarryHarrisScale[], selectedNotes: string[]): BarryHarrisScale[] {
  if (selectedNotes.length === 0) return scales;

  const selectedChroma = Pcset.chroma(selectedNotes);

  return scales.filter(scale => {
    return Pcset.isSupersetOf(selectedNotes)(scale.chroma) || Pcset.isEqual(selectedChroma, scale.chroma);
  });
}
