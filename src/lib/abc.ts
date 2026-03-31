import { Note } from 'tonal';

/**
 * Convert a note like "Db4" to ABC pitch notation like "_D".
 */
export function noteToAbc(note: string): string {
  const pc = Note.pitchClass(note);
  const oct = Note.octave(note);
  if (pc === undefined || oct === null || oct === undefined) return '';

  // Extract letter and accidental
  const letter = pc[0];
  const accidental = pc.slice(1); // '', '#', 'b', '##', 'bb'

  // ABC accidental prefix
  let accPrefix = '';
  if (accidental === '#') accPrefix = '^';
  else if (accidental === '##') accPrefix = '^^';
  else if (accidental === 'b') accPrefix = '_';
  else if (accidental === 'bb') accPrefix = '__';

  // Octave 4 = uppercase, octave 5 = lowercase
  let abcLetter: string;
  let octaveMark = '';

  if (oct <= 4) {
    abcLetter = letter.toUpperCase();
    // Each octave below 4 adds a comma
    for (let i = 0; i < 4 - oct; i++) octaveMark += ',';
  } else {
    abcLetter = letter.toLowerCase();
    // Each octave above 5 adds an apostrophe
    for (let i = 0; i < oct - 5; i++) octaveMark += "'";
  }

  return accPrefix + abcLetter + octaveMark;
}
