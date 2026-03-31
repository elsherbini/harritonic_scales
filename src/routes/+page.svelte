<script lang="ts">
  import { Chord, Note, Pcset, Scale } from 'tonal';
  import { Switch } from '@skeletonlabs/skeleton-svelte';
  import { ALL_SCALES } from '$lib/scales';
  import { filterScales, groupByKeyOverlap, countKeyOverlap } from '$lib/filter';
  import type { OverlapGroup } from '$lib/filter';
  import ScaleDiagram from '$lib/ScaleDiagram.svelte';
  import Piano from '$lib/Piano.svelte';
  import { playSequence, getTonicChord, getSequenceChords } from '$lib/playback';
  import StaffNotation from '$lib/StaffNotation.svelte';
  import { scaleToAbc, sequenceToAbc } from '$lib/abc';

  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function toFlat(note: string): string {
    const midi = Note.midi(note + '4');
    if (midi === null) return note;
    return Note.pitchClass(Note.fromMidi(midi));
  }

  function toSharp(note: string): string {
    const midi = Note.midi(note + '4');
    if (midi === null) return note;
    return Note.pitchClass(Note.fromMidiSharps(midi));
  }

  let useSharpsKey = $state(false);
  let useSharpsTarget = $state(false);
  let keyNoteNames = $derived(useSharpsKey ? SHARP_NAMES : FLAT_NAMES);
  let targetNoteNames = $derived(useSharpsTarget ? SHARP_NAMES : FLAT_NAMES);

  const ALL_MAJOR_MODES = Scale.modeNames('major').map(m => m[1]);
  const HARMONIC_MINOR_MODES = Scale.modeNames('harmonic minor').map(m => m[1]);
  const MELODIC_MINOR_MODES = Scale.modeNames('melodic minor').map(m => m[1]);

  // "Something Else" dropdown: other major modes (not "major" or "minor"), then harmonic/melodic minor
  const OTHER_MAJOR_MODES = ALL_MAJOR_MODES.filter(m => m !== 'major' && m !== 'minor');
  const SOMETHING_ELSE_MODES = [...OTHER_MAJOR_MODES, ...HARMONIC_MINOR_MODES, ...MELODIC_MINOR_MODES];
  const isSomethingElse = (q: string | null) => q !== null && q !== 'major' && q !== 'minor';

  // --- Target Notes state ---
  let selectedNotes = $state<Set<string>>(new Set());

  let filteredScales = $derived(filterScales(ALL_SCALES, [...selectedNotes]));

  function toggleNote(note: string) {
    const next = new Set(selectedNotes);
    if (next.has(note)) {
      next.delete(note);
      if (targetRoot === note) targetRoot = null;
    } else {
      next.add(note);
    }
    selectedNotes = next;
  }

  function clearSelection() {
    selectedNotes = new Set();
    targetRoot = null;
    activeSequenceChords = null;
    staffHighlightIndex = null;
  }

  function toggleTargetSharps() {
    const convert = useSharpsTarget ? toFlat : toSharp;
    selectedNotes = new Set([...selectedNotes].map(convert));
    if (targetRoot) targetRoot = convert(targetRoot);
    useSharpsTarget = !useSharpsTarget;
  }

  function toggleKeySharps() {
    const convert = useSharpsKey ? toFlat : toSharp;
    if (selectedRoot) selectedRoot = convert(selectedRoot);
    useSharpsKey = !useSharpsKey;
  }

  // --- Target root note ---
  let targetRoot = $state<string | null>(null);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  function handleTargetDblClick(note: string) {
    if (!selectedNotes.has(note)) {
      const next = new Set(selectedNotes);
      next.add(note);
      selectedNotes = next;
    }
    targetRoot = targetRoot === note ? null : note;
  }

  function handleTargetPointerDown(note: string) {
    longPressTimer = setTimeout(() => {
      handleTargetDblClick(note);
      longPressTimer = null;
    }, 300);
  }

  function handleTargetPointerUp() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // --- Chord name detection ---
  let detectedChordName = $derived.by(() => {
    const notes = [...selectedNotes];
    if (notes.length < 2) return null;
    const detected = Chord.detect(notes);
    if (!detected.length) return null;
    let name: string;
    if (targetRoot) {
      name = detected.find(n => n.startsWith(targetRoot!)) ?? detected[0];
    } else {
      name = detected[0];
    }
    return name.replace(/M$/, 'Maj');
  });

  // --- Key state ---
  let selectedRoot = $state<string | null>(null);
  let selectedQuality = $state<string | null>(null);

  let selectedKey = $derived.by(() => {
    if (!selectedRoot || !selectedQuality) return null;
    const scale = Scale.get(selectedRoot + ' ' + selectedQuality);
    if (!scale.notes.length) return null;
    return {
      name: selectedRoot + ' ' + selectedQuality,
      notes: scale.notes,
      chroma: Pcset.chroma(scale.notes),
    };
  });

  function selectRoot(root: string) {
    selectedRoot = selectedRoot === root ? null : root;
    activeSequenceChords = null;
    staffHighlightIndex = null;
  }

  function selectQuality(quality: string) {
    selectedQuality = selectedQuality === quality ? null : quality;
    activeSequenceChords = null;
    staffHighlightIndex = null;
  }

  function clearKey() {
    selectedRoot = null;
    selectedQuality = null;
    activeSequenceChords = null;
    activeScaleNotes = null;
    staffHighlightIndex = null;
  }

  // --- Play hint ---
  let playHint = $derived.by(() => {
    if (!selectedKey && !targetRoot) return 'Select a key and root note to play';
    if (!selectedKey) return 'Select a key to play';
    if (!targetRoot) return 'Select a root note to play';
    return null;
  });

  // --- Grouping ---
  let groupedByType = $derived({
    maj6: filteredScales.filter(s => s.type === 'maj6'),
    min6: filteredScales.filter(s => s.type === 'min6'),
    dom7: filteredScales.filter(s => s.type === 'dom7'),
    dom7b5: filteredScales.filter(s => s.type === 'dom7b5'),
    octatonic: filteredScales.filter(s => s.type === 'octatonic'),
  });

  const TYPE_LABELS: Record<string, string> = {
    maj6: 'Maj6 Diminished',
    min6: 'Min6 Diminished',
    dom7: 'Dom7 Diminished',
    dom7b5: 'Dom7b5 Diminished',
    octatonic: 'Octatonic',
  };

  let overlapGroups = $derived<OverlapGroup[]>(
    selectedKey ? groupByKeyOverlap(filteredScales, selectedKey.chroma) : []
  );

  // --- Diagram saturation ---
  let scaleSaturations = $derived.by(() => {
    const filteredSet = new Set(filteredScales.map(s => s.name));
    const map = new Map<string, number>();
    for (const scale of ALL_SCALES) {
      if (!filteredSet.has(scale.name)) {
        map.set(scale.name, 0);
      } else if (selectedKey) {
        const overlap = countKeyOverlap(selectedKey.chroma, scale.chroma);
        map.set(scale.name, overlap / selectedKey.notes.length);
      } else {
        map.set(scale.name, 1);
      }
    }
    return map;
  });

  // --- Dim7 group colors by chroma (works for both sharps and flats) ---
  // Key colors: orange=C/Eb/Gb/A, purple=Db/E/G/Bb, green=D/F/Ab/B
  const KEY_COLOR_BY_CHROMA: Record<number, string> = {
    0: 'rgb(240, 154, 65)', 3: 'rgb(240, 154, 65)', 6: 'rgb(240, 154, 65)', 9: 'rgb(240, 154, 65)',
    1: 'rgb(119, 65, 240)', 4: 'rgb(119, 65, 240)', 7: 'rgb(119, 65, 240)', 10: 'rgb(119, 65, 240)',
    2: 'rgb(41, 240, 67)', 5: 'rgb(41, 240, 67)', 8: 'rgb(41, 240, 67)', 11: 'rgb(41, 240, 67)',
  };

  // Target colors: yellow=C/Eb/Gb/A, red=Db/E/G/Bb, blue=D/F/Ab/B
  const DIM7_COLOR_BY_CHROMA: Record<number, string> = {
    0: 'rgb(239, 227, 65)', 3: 'rgb(239, 227, 65)', 6: 'rgb(239, 227, 65)', 9: 'rgb(239, 227, 65)',
    1: 'rgb(240, 41, 93)', 4: 'rgb(240, 41, 93)', 7: 'rgb(240, 41, 93)', 10: 'rgb(240, 41, 93)',
    2: 'rgb(86, 180, 233)', 5: 'rgb(86, 180, 233)', 8: 'rgb(86, 180, 233)', 11: 'rgb(86, 180, 233)',
  };

  function keyColor(note: string): string {
    return KEY_COLOR_BY_CHROMA[Note.chroma(note) ?? 0];
  }

  function dim7Color(note: string): string {
    return DIM7_COLOR_BY_CHROMA[Note.chroma(note) ?? 0];
  }

  let selectedRootColor = $derived(selectedRoot ? keyColor(selectedRoot) : null);

  // --- Note highlighting ---
  let selectedChroma = $derived(
    selectedNotes.size > 0 ? Pcset.chroma([...selectedNotes]) : null
  );

  function isTargetNote(note: string): boolean {
    if (!selectedChroma) return false;
    const noteChroma = Pcset.chroma([note]);
    for (let i = 0; i < 12; i++) {
      if (noteChroma[i] === '1' && selectedChroma[i] === '1') return true;
    }
    return false;
  }

  function isKeyNote(note: string): boolean {
    if (!selectedKey) return false;
    const noteChroma = Pcset.chroma([note]);
    for (let i = 0; i < 12; i++) {
      if (noteChroma[i] === '1' && selectedKey.chroma[i] === '1') return true;
    }
    return false;
  }

  let piano: Piano;

  // --- Staff notation state ---
  let staffClef = $state<'treble' | 'diminished'>('treble');
  let staffHighlightIndex = $state<number | null>(null);
  let activeSequenceChords = $state<string[][] | null>(null);
  let activeScaleNotes = $state<string[] | null>(null);
  let activeScaleRoot = $state<string | null>(null);

  let staffAbc = $derived.by(() => {
    if (activeSequenceChords && selectedKey) {
      return sequenceToAbc(activeSequenceChords, selectedKey.notes[0], selectedQuality!);
    }
    if (activeScaleNotes && activeScaleRoot) {
      return scaleToAbc(activeScaleNotes, activeScaleRoot, null);
    }
    return 'X:1\nL:1/4\nK:C clef=treble\n';
  });

  function handleScaleDiagramClick(scaleName: string) {
    const scale = ALL_SCALES.find(s => s.name === scaleName);
    if (!scale) return;

    // Show scale notes on staff as ascending run
    const scaleNotes = Pcset.notes(scale.chroma);
    const rootChroma = Note.chroma(scale.root)!;
    const ascending: string[] = [];
    let oct = 4;
    let prevChroma = -1;
    for (const pc of scaleNotes) {
      const chroma = Note.chroma(pc)!;
      if (prevChroma >= 0 && chroma <= prevChroma) oct++;
      ascending.push(pc + oct);
      prevChroma = chroma;
    }

    activeScaleNotes = ascending;
    activeScaleRoot = scale.root;
    activeSequenceChords = null;
    staffHighlightIndex = null;

    // If key+target selected, also play
    if (selectedKey && targetRoot) handlePlay(scale);
  }

  async function handlePlay(scale: { name: string; chroma: string; root: string }) {
    if (!selectedKey || !targetRoot) return;
    await piano.ensureReady();
    const sampler = piano.getSampler();
    if (!sampler) return;

    const scaleNotes = Pcset.notes(scale.chroma);
    const tonicChordNotes = getTonicChord(selectedKey.notes[0], selectedQuality!);

    activeSequenceChords = getSequenceChords({
      tonicRoot: selectedKey.notes[0],
      tonicChordNotes,
      targetRoot,
      targetChordNotes: [...selectedNotes],
      scaleNotes,
    });
    staffHighlightIndex = null;

    playSequence({
      sampler,
      tonicRoot: selectedKey.notes[0],
      tonicChordNotes,
      targetRoot,
      targetChordNotes: [...selectedNotes],
      scaleNotes,
      onNotesChange: (notes) => piano.setNotesPlaying(notes),
      onSustainOn: () => piano.sustainOn(),
      onSustainOff: () => piano.sustainOff(),
      onChordIndex: (idx) => { staffHighlightIndex = idx >= 0 ? idx : null; },
    });
  }
</script>

<main class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="h1 mb-1">Harritonic Scales</h1>
  <p class="text-sm text-surface-500 mb-6">Pick a scale for a chord from outside the key</p>

  <!-- Key Selector -->
  <div class="mb-6">
    <div class="flex items-center gap-2 mb-2">
      <h2 class="text-sm font-semibold text-surface-500 tracking-wide">Key: If you are in the key of...</h2>
      <Switch checked={useSharpsKey} onCheckedChange={() => toggleKeySharps()}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label><span class="text-sm font-semibold">{useSharpsKey ? '♯' : '♭'}</span></Switch.Label>
        <Switch.HiddenInput />
      </Switch>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      {#each keyNoteNames as note}
        <button
          class="chip font-mono {selectedRoot === note
            ? ''
            : 'preset-outlined-surface-500'}"
          style={selectedRoot === note
            ? `background-color: ${keyColor(note)}; color: var(--color-surface-950);`
            : ''}
          onclick={() => selectRoot(note)}
        >
          {note}
        </button>
      {/each}
      <button
        class="btn btn-sm preset-tonal-surface"
        onclick={clearKey}
      >
        Clear
      </button>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      <button
        class="chip {selectedQuality === 'major'
          ? ''
          : 'preset-outlined-surface-500'}"
        style={selectedQuality === 'major'
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onclick={() => selectQuality('major')}
      >
        Major
      </button>
      <button
        class="chip {selectedQuality === 'minor'
          ? ''
          : 'preset-outlined-surface-500'}"
        style={selectedQuality === 'minor'
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onclick={() => selectQuality('minor')}
      >
        Natural Minor
      </button>
      <select
        class="select text-sm max-w-48"
        style={isSomethingElse(selectedQuality)
          ? selectedRootColor
            ? `background-color: ${selectedRootColor}; color: var(--color-surface-950);`
            : 'background-color: light-dark(var(--color-surface-950), var(--color-surface-50)); color: light-dark(var(--color-surface-50), var(--color-surface-950));'
          : ''}
        onchange={(e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val) selectQuality(val); else selectedQuality = null;
        }}
        value={isSomethingElse(selectedQuality) ? selectedQuality : ''}
      >
        <option value="">Something Else...</option>
        <optgroup label="Major Modes">
          {#each OTHER_MAJOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
        <optgroup label="Harmonic Minor">
          {#each HARMONIC_MINOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
        <optgroup label="Melodic Minor">
          {#each MELODIC_MINOR_MODES as mode}
            <option value={mode}>{mode}</option>
          {/each}
        </optgroup>
      </select>
    </div>
    {#if selectedKey}
      <p class="text-sm text-surface-500">
        Key: {selectedKey.name} — {selectedKey.notes.join(', ')}
      </p>
    {/if}
  </div>

  <!-- Target Notes -->
  <div class="mb-6">
    <div class="flex items-center gap-2 mb-2">
      <h2 class="text-sm font-semibold text-surface-500 tracking-wide">Target Notes: And you are playing a chord with these notes...</h2>
      <Switch checked={useSharpsTarget} onCheckedChange={() => toggleTargetSharps()}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label><span class="text-sm font-semibold">{useSharpsTarget ? '♯' : '♭'}</span></Switch.Label>
        <Switch.HiddenInput />
      </Switch>
    </div>
    <div class="flex flex-wrap gap-2 mb-3">
      {#each targetNoteNames as note}
        <div class="flex flex-col items-center gap-1">
          <button
            class="chip font-mono {selectedNotes.has(note)
              ? ''
              : 'preset-outlined-surface-500'}"
            style="{selectedNotes.has(note)
              ? `background-color: ${dim7Color(note)}; color: var(--color-surface-950);`
              : ''}{targetRoot === note
              ? ' border: 3px solid light-dark(var(--color-surface-950), var(--color-surface-50));'
              : ''}"
            onclick={() => toggleNote(note)}
            ondblclick={() => handleTargetDblClick(note)}
            onpointerdown={() => handleTargetPointerDown(note)}
            onpointerup={handleTargetPointerUp}
            onpointercancel={handleTargetPointerUp}
          >
            {note}
          </button>
          <button
            class="flex items-center justify-center"
            style="height: 1rem;"
            disabled={!selectedNotes.has(note)}
            onclick={() => { targetRoot = targetRoot === note ? null : note; }}
          >
            <span
              class="inline-block rounded-full border-2"
              style="width: 0.75rem; height: 0.75rem; {selectedNotes.has(note)
                ? `border-color: ${dim7Color(note)};`
                : 'border-color: var(--color-surface-400); opacity: 0.3;'}{targetRoot === note
                ? ` background-color: ${dim7Color(note)};`
                : ''}"
            ></span>
          </button>
        </div>
      {/each}
      <div class="flex flex-col items-center gap-1">
        <button
          class="btn btn-sm preset-tonal-surface"
          onclick={clearSelection}
        >
          Clear
        </button>
        <span class="text-xs text-surface-400">Root</span>
      </div>
    </div>
    {#if detectedChordName}
      <p class="text-sm text-surface-500">Chord: {detectedChordName}</p>
    {/if}
  </div>

  <!-- Results Count -->
  <p class="text-sm text-surface-500 mb-4">
    Showing {filteredScales.length} of {ALL_SCALES.length} scales
  </p>

  <!-- Scale Diagram -->
  <div class="mb-6">
    <ScaleDiagram {scaleSaturations} onScaleClick={handleScaleDiagramClick} />
  </div>

  <!-- Staff Notation -->
  <div class="mb-6">
    <div class="flex items-center gap-2 mb-2">
      <h2 class="text-sm font-semibold text-surface-500 tracking-wide">Staff</h2>
      <Switch checked={staffClef === 'diminished'} onCheckedChange={() => { staffClef = staffClef === 'treble' ? 'diminished' : 'treble'; }}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label><span class="text-sm font-semibold">{staffClef === 'treble' ? 'Traditional' : 'Diminished'}</span></Switch.Label>
        <Switch.HiddenInput />
      </Switch>
    </div>
    <StaffNotation abc={staffAbc} clef={staffClef} highlightIndex={staffHighlightIndex} />
  </div>

  <!-- Piano -->
  <div class="mb-6">
    <Piano bind:this={piano} />
  </div>

  <p class="text-sm text-surface-500 mb-4">You could use the following scales, sorted by how consonant they are</p>

  <!-- Scale List: grouped by overlap when key active, by type otherwise -->
  {#if selectedKey}
    {#each overlapGroups as group}
      <section class="mb-6">
        <h2 class="h4 mb-2">
          {group.overlap} of {selectedKey.notes.length} key notes
        </h2>
        <div class="space-y-2">
          {#each group.scales as scale}
            <div class="card preset-outlined-surface-200-800 p-3">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-medium">{scale.name}</span>
                <span class="text-xs text-surface-400">{group.overlap}/{selectedKey.notes.length}</span>
                {#if playHint}
                  <span class="text-xs text-surface-400 ml-auto">{playHint}</span>
                {/if}
                <button
                  class="btn-icon btn-icon-sm preset-tonal-primary {playHint ? '' : 'ml-auto'}"
                  disabled={!selectedKey || !targetRoot}
                  onclick={() => handlePlay(scale)}
                  title="Play sequence"
                >&#9654;</button>
              </div>
              <div class="flex gap-1.5 flex-wrap">
                {#each Pcset.notes(scale.chroma) as note}
                  <span
                    class="px-1.5 py-0.5 rounded text-sm font-mono"
                    class:font-bold={isKeyNote(note)}
                    class:underline={isTargetNote(note)}
                    class:decoration-2={isTargetNote(note)}
                    class:underline-offset-2={isTargetNote(note)}
                  >
                    {note}
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    {#each Object.entries(groupedByType) as [type, scales]}
      {#if scales.length > 0}
        <section class="mb-6">
          <h2 class="h4 mb-2">{TYPE_LABELS[type]}</h2>
          <div class="space-y-2">
            {#each scales as scale}
              <div class="card preset-outlined-surface-200-800 p-3">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="font-medium">{scale.name}</span>
                  {#if playHint}
                    <span class="text-xs text-surface-400 ml-auto">{playHint}</span>
                  {/if}
                  <button
                    class="btn-icon btn-icon-sm preset-tonal-primary {playHint ? '' : 'ml-auto'}"
                    disabled={!selectedKey || !targetRoot}
                    onclick={() => handlePlay(scale)}
                    title="Play sequence"
                  >&#9654;</button>
                </div>
                <div class="flex gap-1.5 flex-wrap">
                  {#each Pcset.notes(scale.chroma) as note}
                    <span
                      class="px-1.5 py-0.5 rounded text-sm font-mono"
                      class:underline={isTargetNote(note)}
                      class:decoration-2={isTargetNote(note)}
                      class:underline-offset-2={isTargetNote(note)}
                    >
                      {note}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  {/if}
</main>
