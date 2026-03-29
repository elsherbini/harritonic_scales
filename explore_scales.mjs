import { Chord, Note, Pcset } from "tonal";

// Helper
function heading(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

function buildSixDimScale(root, chordType) {
  const label =
    chordType === "m6"
      ? "Min6"
      : chordType === "maj6"
      ? "Maj6"
      : chordType;

  const chordNotes = Chord.notes(chordType, root);
  const dimRoot = Note.transpose(root, "-1m");
  const dim7Notes = Chord.notes("dim7", dimRoot);
  const combined = [...chordNotes, ...dim7Notes];
  const chroma = Pcset.chroma(combined);
  const notes = Pcset.notes(chroma);

  console.log(`  ${root} ${label} chord notes : ${chordNotes.join(", ")}`);
  console.log(`  dim root (${root} - m2)      : ${dimRoot}`);
  console.log(`  dim7 chord notes            : ${dim7Notes.join(", ")}`);
  console.log(`  combined                    : ${combined.join(", ")}`);
  console.log(`  chroma                      : ${chroma}`);
  console.log(`  scale notes                 : ${notes.join(", ")}`);
  console.log(`  note count                  : ${notes.length}`);
  return { chroma, notes, combined };
}

// 1 & 2: C Maj6 Diminished
heading("1. C Maj6 Diminished Scale");
const maj6dim = buildSixDimScale("C", "maj6");

// 3: C Min6 Diminished
heading("2. C Min6 Diminished Scale");
const min6dim = buildSixDimScale("C", "m6");

// 4: C Dom7 Diminished
heading("3. C Dom7 Diminished Scale");
{
  const chordNotes = Chord.notes("7", "C");
  const dimRoot = Note.transpose("C", "-1m");
  const dim7Notes = Chord.notes("dim7", dimRoot);
  const combined = [...chordNotes, ...dim7Notes];
  const chroma = Pcset.chroma(combined);
  const notes = Pcset.notes(chroma);
  console.log(`  C7 chord notes   : ${chordNotes.join(", ")}`);
  console.log(`  dim root         : ${dimRoot}`);
  console.log(`  dim7 chord notes : ${dim7Notes.join(", ")}`);
  console.log(`  combined         : ${combined.join(", ")}`);
  console.log(`  chroma           : ${chroma}`);
  console.log(`  scale notes      : ${notes.join(", ")}`);
  console.log(`  note count       : ${notes.length}`);
}

// 5: C Dom7b5 Diminished
heading("4. C Dom7b5 Diminished Scale");
{
  const chordNotes = Chord.notes("7b5", "C");
  const dimRoot = Note.transpose("C", "-1m");
  const dim7Notes = Chord.notes("dim7", dimRoot);
  const combined = [...chordNotes, ...dim7Notes];
  const chroma = Pcset.chroma(combined);
  const notes = Pcset.notes(chroma);
  console.log(`  C7b5 chord notes : ${chordNotes.join(", ")}`);
  console.log(`  dim root         : ${dimRoot}`);
  console.log(`  dim7 chord notes : ${dim7Notes.join(", ")}`);
  console.log(`  combined         : ${combined.join(", ")}`);
  console.log(`  chroma           : ${chroma}`);
  console.log(`  scale notes      : ${notes.join(", ")}`);
  console.log(`  note count       : ${notes.length}`);
}

// 6: C Octatonic (two dim7 chords)
heading("5. C Octatonic (Cdim7 + dim7 a half step below C)");
{
  const dim7_C = Chord.notes("dim7", "C");
  const dimRoot2 = Note.transpose("C", "-1m");
  const dim7_below = Chord.notes("dim7", dimRoot2);
  const combined = [...dim7_C, ...dim7_below];
  const chroma = Pcset.chroma(combined);
  const notes = Pcset.notes(chroma);
  console.log(`  Cdim7 notes          : ${dim7_C.join(", ")}`);
  console.log(`  dim root (C - m2)    : ${dimRoot2}`);
  console.log(`  dim7 below notes     : ${dim7_below.join(", ")}`);
  console.log(`  combined             : ${combined.join(", ")}`);
  console.log(`  chroma               : ${chroma}`);
  console.log(`  scale notes          : ${notes.join(", ")}`);
  console.log(`  note count           : ${notes.length}`);
}

// 7: Enharmonic edge cases
heading("6. Enharmonic Edge Cases");
{
  const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  console.log("  Transposing each root down by m2 (Note.transpose(root, '-1m')):");
  for (const r of roots) {
    const result = Note.transpose(r, "-1m");
    const flag = result.length > 2 ? "  <-- double accidental!" : "";
    console.log(`    ${r.padEnd(3)} -> ${result}${flag}`);
  }
  console.log();
  console.log("  Specific test: Note.transpose('Db', '-1m') =", Note.transpose("Db", "-1m"));
  console.log("  Note.enharmonic of that:", Note.enharmonic(Note.transpose("Db", "-1m")));
}

// 8: Pcset.isSupersetOf
heading("7. Pcset.isSupersetOf Test");
{
  const filterChroma = Pcset.chroma(["C", "E"]);
  console.log(`  Filter chroma for [C, E]  : ${filterChroma}`);
  console.log(`  C Maj6 Dim chroma         : ${maj6dim.chroma}`);

  const isSupersetOfCE = Pcset.isSupersetOf(filterChroma);
  const result = isSupersetOfCE(maj6dim.chroma);
  console.log(`  isSupersetOf([C,E])(maj6dim) = ${result}`);

  const isSubsetOfMaj6Dim = Pcset.isSubsetOf(maj6dim.chroma);
  const result2 = isSubsetOfMaj6Dim(filterChroma);
  console.log(`  isSubsetOf(maj6dim)([C,E])   = ${result2}`);
}

// 9: Pcset.isEqual
heading("8. Pcset.isEqual Test");
{
  const chroma1 = Pcset.chroma(["C", "E", "G"]);
  const chroma2 = Pcset.chroma(["C", "E", "G"]);
  const chroma3 = Pcset.chroma(["C", "Eb", "G"]);
  console.log(`  chroma [C,E,G]  = ${chroma1}`);
  console.log(`  chroma [C,E,G]  = ${chroma2}`);
  console.log(`  chroma [C,Eb,G] = ${chroma3}`);

  if (typeof Pcset.isEqual === "function") {
    console.log(`  isEqual(chroma1, chroma2) = ${Pcset.isEqual(chroma1, chroma2)}`);
    console.log(`  isEqual(chroma1, chroma3) = ${Pcset.isEqual(chroma1, chroma3)}`);
  } else {
    console.log("  Pcset.isEqual is not a function -- using direct string comparison:");
    console.log(`  chroma1 === chroma2 : ${chroma1 === chroma2}`);
    console.log(`  chroma1 === chroma3 : ${chroma1 === chroma3}`);
  }
}

// 10: All 12 Maj6 Diminished Scales
heading("9. All 12 Maj6 Diminished Scales");
{
  const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const results = [];

  for (const root of roots) {
    const maj6 = Chord.notes("maj6", root);
    const dimRoot = Note.transpose(root, "-1m");
    const dimRootClean = Note.enharmonic(dimRoot) || dimRoot;
    const dim7 = Chord.notes("dim7", dimRootClean);
    const combined = [...maj6, ...dim7];
    const chroma = Pcset.chroma(combined);
    const notes = Pcset.notes(chroma);
    results.push({ root, dimRoot, dimRootClean, maj6, dim7, chroma, notes });
  }

  console.log(
    "  Root | dimRoot (clean) | Chroma       | Notes"
  );
  console.log("  " + "-".repeat(75));
  for (const r of results) {
    const rootStr = r.root.padEnd(3);
    const dimStr = `${r.dimRoot} (${r.dimRootClean})`.padEnd(16);
    console.log(
      `  ${rootStr}| ${dimStr}| ${r.chroma} | ${r.notes.join(", ")}`
    );
  }

  console.log();
  console.log("  Duplicate chroma check:");
  const chromaMap = new Map();
  for (const r of results) {
    if (!chromaMap.has(r.chroma)) {
      chromaMap.set(r.chroma, []);
    }
    chromaMap.get(r.chroma).push(r.root);
  }
  let dupeCount = 0;
  for (const [chroma, roots] of chromaMap) {
    if (roots.length > 1) {
      dupeCount++;
      console.log(`    DUPLICATE: ${roots.join(", ")} share chroma ${chroma}`);
    }
  }
  if (dupeCount === 0) {
    console.log("    No duplicates found -- all 12 chromas are unique.");
  } else {
    console.log(`    ${dupeCount} duplicate chroma group(s) found out of ${chromaMap.size} unique chromas.`);
  }
  console.log(`    Unique chromas: ${chromaMap.size} / 12`);
}

console.log("\n" + "=".repeat(60));
console.log("  Done.");
console.log("=".repeat(60));
