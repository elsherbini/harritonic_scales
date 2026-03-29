import { Pcset } from 'tonal';
import type { BarryHarrisScale } from './scales';

export function filterScales(scales: BarryHarrisScale[], selectedNotes: string[]): BarryHarrisScale[] {
  if (selectedNotes.length === 0) return scales;

  const selectedChroma = Pcset.chroma(selectedNotes);

  return scales.filter(scale => {
    return Pcset.isSupersetOf(selectedNotes)(scale.chroma) || Pcset.isEqual(selectedChroma, scale.chroma);
  });
}
