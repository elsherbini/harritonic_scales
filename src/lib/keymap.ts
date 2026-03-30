import * as Tone from 'tone';

export type PianoKey = {
  key: string;
  midi: number;
  x: number;
  isBlack: boolean;
};

const semitones: Record<number, string> = {
  1: 'C', 2: 'C#', 3: 'D', 4: 'D#', 5: 'E', 6: 'F',
  7: 'F#', 8: 'G', 9: 'G#', 10: 'A', 11: 'A#', 12: 'B',
};

const WHITE_KEY_WIDTH = 24;
const BLACK_KEY_WIDTH = 16;
const BLACK_KEY_OFFSET = WHITE_KEY_WIDTH / 2 + (WHITE_KEY_WIDTH - BLACK_KEY_WIDTH) / 2;

function getSemitoneIndex(noteName: string): number {
  return Object.entries(semitones).findIndex(([, n]) => n === noteName) + 1;
}

function getOctave(note: string): number {
  return parseInt(note.replace(/[^0-9]/g, ''));
}

function getNoteName(note: string): string {
  return note.replace(/[0-9]/g, '');
}

export function generateKeys(firstNote = 'E1', lastNote = 'E7'): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteKeyNum = 0;
  let currentIndex = 0;

  for (let oct = getOctave(firstNote); oct <= getOctave(lastNote); oct++) {
    const isLowestOctave = oct === getOctave(firstNote);
    const isHighestOctave = oct === getOctave(lastNote);
    const startingNote = isLowestOctave ? getSemitoneIndex(getNoteName(firstNote)) : 1;
    const endNote = isHighestOctave ? getSemitoneIndex(getNoteName(lastNote)) : 12;

    for (let note = startingNote; note <= endNote; note++) {
      const key = semitones[note] + oct;
      const isBlack = semitones[note].includes('#');
      keys.push({
        key,
        midi: Tone.Frequency(semitones[note] + oct).toMidi(),
        x: isBlack ? keys[currentIndex - 1].x + BLACK_KEY_OFFSET : whiteKeyNum * WHITE_KEY_WIDTH,
        isBlack,
      });
      currentIndex++;
      if (!isBlack) whiteKeyNum++;
    }
  }

  return keys;
}
