import { Pcset } from 'tonal';
import type { BarryHarrisScale } from './scales';

export function countKeyOverlap(keyChroma: string, scaleChroma: string): number {
  let count = 0;
  for (let i = 0; i < 12; i++) {
    if (keyChroma[i] === '1' && scaleChroma[i] === '1') count++;
  }
  return count;
}

export type OverlapGroup = {
  overlap: number;
  scales: BarryHarrisScale[];
};

export function groupByKeyOverlap(scales: BarryHarrisScale[], keyChroma: string): OverlapGroup[] {
  const buckets = new Map<number, BarryHarrisScale[]>();

  for (const scale of scales) {
    const overlap = countKeyOverlap(keyChroma, scale.chroma);
    if (!buckets.has(overlap)) buckets.set(overlap, []);
    buckets.get(overlap)!.push(scale);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .filter(([_, scales]) => scales.length > 0)
    .map(([overlap, scales]) => ({ overlap, scales }));
}

export function filterScales(scales: BarryHarrisScale[], selectedNotes: string[]): BarryHarrisScale[] {
  if (selectedNotes.length === 0) return scales;

  const selectedChroma = Pcset.chroma(selectedNotes);

  return scales.filter(scale => {
    return Pcset.isSupersetOf(selectedNotes)(scale.chroma) || Pcset.isEqual(selectedChroma, scale.chroma);
  });
}
