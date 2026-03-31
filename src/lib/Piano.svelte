<script lang="ts">
  import * as Tone from 'tone';
  import { generateKeys, type PianoKey } from './keymap';
  import { base } from '$app/paths';

  import { Note } from 'tonal';

  function toSharpName(note: string): string {
    const midi = Note.midi(note);
    if (midi === null) return note;
    return Note.fromMidiSharps(midi);
  }

  const RHODES_URLS: Record<string, string> = {
    A1: "RhodesMK1_A1_60.mp3", A2: "RhodesMK1_A2_70.mp3", A3: "RhodesMK1_A3_70.mp3",
    A4: "RhodesMK1_A4_60.mp3", A5: "RhodesMK1_A5_60.mp3", A6: "RhodesMK1_A6_70.mp3",
    "A#1": "RhodesMK1_As1_60.mp3", "A#2": "RhodesMK1_As2_70.mp3", "A#3": "RhodesMK1_As3_70.mp3",
    "A#4": "RhodesMK1_As4_60.mp3", "A#5": "RhodesMK1_As5_60.mp3", "A#6": "RhodesMK1_As6_70.mp3",
    B1: "RhodesMK1_B1_60.mp3", B2: "RhodesMK1_B2_70.mp3", B3: "RhodesMK1_B3_70.mp3",
    B4: "RhodesMK1_B4_70.mp3", B5: "RhodesMK1_B5_60.mp3", B6: "RhodesMK1_B6_60.mp3",
    C2: "RhodesMK1_C2_60.mp3", C3: "RhodesMK1_C3_70.mp3", C4: "RhodesMK1_C4_70.mp3",
    C5: "RhodesMK1_C5_60.mp3", C6: "RhodesMK1_C6_60.mp3", C7: "RhodesMK1_C7_60.mp3",
    "C#2": "RhodesMK1_Cs2_70.mp3", "C#3": "RhodesMK1_Cs3_60.mp3", "C#4": "RhodesMK1_Cs4_60.mp3",
    "C#5": "RhodesMK1_Cs5_70.mp3", "C#6": "RhodesMK1_Cs6_60.mp3", "C#7": "RhodesMK1_Cs7_60.mp3",
    D2: "RhodesMK1_D2_70.mp3", D3: "RhodesMK1_D3_60.mp3", D4: "RhodesMK1_D4_60.mp3",
    D5: "RhodesMK1_D5_70.mp3", D6: "RhodesMK1_D6_60.mp3", D7: "RhodesMK1_D7_60.mp3",
    "D#2": "RhodesMK1_Ds2_60.mp3", "D#3": "RhodesMK1_Ds3_70.mp3", "D#4": "RhodesMK1_Ds4_60.mp3",
    "D#5": "RhodesMK1_Ds5_60.mp3", "D#6": "RhodesMK1_Ds6_60.mp3", "D#7": "RhodesMK1_Ds7_60.mp3",
    E1: "RhodesMK1_E1_60.mp3", E3: "RhodesMK1_E3_70.mp3", E4: "RhodesMK1_E4_60.mp3",
    E5: "RhodesMK1_E5_60.mp3", E6: "RhodesMK1_E6_60.mp3", E7: "RhodesMK1_E7_70.mp3",
    F1: "RhodesMK1_F1_60.mp3", F2: "RhodesMK1_F2_70.mp3", F3: "RhodesMK1_F3_60.mp3",
    F4: "RhodesMK1_F4_60.mp3", F5: "RhodesMK1_F5_70.mp3", F6: "RhodesMK1_F6_60.mp3",
    "F#1": "RhodesMK1_Fs1_60.mp3", "F#2": "RhodesMK1_Fs2_70.mp3", "F#3": "RhodesMK1_Fs3_70.mp3",
    "F#4": "RhodesMK1_Fs4_60.mp3", "F#5": "RhodesMK1_Fs5_70.mp3", "F#6": "RhodesMK1_Fs6_60.mp3",
    G1: "RhodesMK1_G1_60.mp3", G2: "RhodesMK1_G2_70.mp3", G3: "RhodesMK1_G3_70.mp3",
    G4: "RhodesMK1_G4_80.mp3", G5: "RhodesMK1_G5_60.mp3", G6: "RhodesMK1_G6_60.mp3",
    "G#1": "RhodesMK1_Gs1_60.mp3", "G#2": "RhodesMK1_Gs2_60.mp3", "G#3": "RhodesMK1_Gs3_60.mp3",
    "G#4": "RhodesMK1_Gs4_60.mp3", "G#5": "RhodesMK1_Gs5_60.mp3", "G#6": "RhodesMK1_Gs6_70.mp3",
  };

  const keys = generateKeys('C2', 'E6');
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  // Compute black key positions as percentage of total width
  // Each black key sits to the right of the preceding white key
  const blackKeyPositions = blackKeys.map(bk => {
    const whiteIdx = whiteKeys.filter(wk => wk.midi < bk.midi).length;
    const pct = (whiteIdx / whiteKeys.length) * 100;
    return { ...bk, pct };
  });

  let sampler: Tone.Sampler | null = null;
  let reverb: Tone.Reverb | null = null;
  let samplesLoaded = $state(false);
  let isLoadingSamples = $state(false);
  let notesPlaying = $state<string[]>([]);
  let isDragging = $state(false);
  let isSustaining = $state(false);
  let sustainedNotes = $state<string[]>([]);

  async function init() {
    if (sampler) return;
    isLoadingSamples = true;
    await Tone.start();
    const ctx = Tone.getContext();
    if (!ctx.disposed) ctx.dispose();
    Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 }));
    Tone.getContext().transport.bpm.value = 100;
    Tone.getDestination().volume.value = 0;

    reverb = new Tone.Reverb({ wet: 0.4, decay: 2, preDelay: 0.2 }).toDestination();

    const encodedUrls: Record<string, string> = {};
    for (const [k, v] of Object.entries(RHODES_URLS)) {
      encodedUrls[k] = encodeURIComponent(v);
    }

    return new Promise<void>((resolve, reject) => {
      sampler = new Tone.Sampler({
        context: Tone.getContext(),
        urls: encodedUrls,
        baseUrl: `${base}/audio/rhodes/`,
        volume: 10,
        onload: () => {
          isLoadingSamples = false;
          samplesLoaded = true;
          resolve();
        },
        onerror: (err) => {
          isLoadingSamples = false;
          console.error(err);
          reject(err);
        },
      }).connect(reverb!);
    });
  }

  function noteDown(note: string) {
    if (!sampler) {
      init();
      return;
    }
    if (samplesLoaded) {
      sampler.triggerAttack(note, Tone.now());
      notesPlaying = [...notesPlaying, note];
    }
  }

  function noteUp(note: string) {
    if (!sampler || !samplesLoaded) return;
    if (isSustaining) {
      if (!sustainedNotes.includes(note)) {
        sustainedNotes = [...sustainedNotes, note];
      }
    } else {
      sampler.triggerRelease(note);
      notesPlaying = notesPlaying.filter(n => n !== note);
    }
  }

  function onStopDrag() {
    sampler?.releaseAll('+3');
    isDragging = false;
    notesPlaying = [];
  }

  // --- Public API for playback.ts ---
  export function getSampler(): Tone.Sampler | null {
    return sampler;
  }

  export async function ensureReady(): Promise<void> {
    if (!sampler) await init();
  }

  export function sustainOn() {
    isSustaining = true;
    sustainedNotes = [...notesPlaying];
  }

  export function sustainOff() {
    isSustaining = false;
    const toRelease = sustainedNotes.filter(n => !notesPlaying.includes(n));
    if (sampler && toRelease.length) sampler.triggerRelease(toRelease);
    sustainedNotes = sustainedNotes.filter(n => notesPlaying.includes(n));
  }

  export function setNotesPlaying(notes: string[]) {
    notesPlaying = notes.map(toSharpName);
  }
</script>

<div class="piano-container" onmouseup={onStopDrag}>
  {#if isLoadingSamples}
    <p class="text-sm text-surface-500 text-center">Loading samples...</p>
  {/if}

  <piano
    class:loading={isLoadingSamples}
    onmouseleave={() => { isDragging = false; }}
  >
    <div class="white-keys">
      {#each whiteKeys as wk}
        <div
          class="white-key"
          class:playing={notesPlaying.includes(wk.key)}
          class:sustained={sustainedNotes.includes(wk.key)}
          onmousedown={() => { noteDown(wk.key); isDragging = true; }}
          onmouseup={() => { noteUp(wk.key); onStopDrag(); }}
          onmouseenter={() => { if (isDragging) noteDown(wk.key); }}
        ></div>
      {/each}
    </div>
    <div class="black-keys">
      {#each blackKeyPositions as bk}
        <div
          class="black-key"
          class:playing={notesPlaying.includes(bk.key)}
          class:sustained={sustainedNotes.includes(bk.key)}
          style="left: {bk.pct}%; transform: translateX(-50%);"
          onmousedown={() => { noteDown(bk.key); isDragging = true; }}
          onmouseup={() => { noteUp(bk.key); onStopDrag(); }}
          onmouseenter={() => { if (isDragging) noteDown(bk.key); }}
        ></div>
      {/each}
    </div>
  </piano>
</div>

<style>
  .piano-container {
    display: block;
    width: 100%;
    position: relative;
    max-width: 100%;
  }

  piano {
    min-height: 100px;
    display: block;
    margin: 0 auto;
    position: relative;
    width: 100%;
    pointer-events: auto;
    box-sizing: border-box;
  }

  piano.loading {
    opacity: 0.5;
    pointer-events: none;
  }

  piano .black-keys {
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 75px;
  }

  piano .white-keys {
    position: relative;
    display: flex;
    flex-direction: row;
    height: 100px;
  }

  piano .white-key {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    margin: 0 1px;
    box-sizing: border-box;
    height: 100%;
    border: 1px inset rgb(156, 156, 156);
    border-radius: 4px;
    background-color: light-dark(white, rgba(102, 99, 99, 0.43));
    pointer-events: auto;
  }

  /* Yellow: C(7n+1), A(7n+6) */
  piano .white-key.playing:nth-child(7n+1),
  piano .white-key.playing:nth-child(7n+6) {
    background-color: rgb(239, 227, 65);
    box-shadow: 1px 1px 15px 15px rgba(239, 227, 65, 0.25);
    transform: translateY(2px);
  }
  /* Blue: D(7n+2), F(7n+4), B(7n+7) */
  piano .white-key.playing:nth-child(7n+2),
  piano .white-key.playing:nth-child(7n+4),
  piano .white-key.playing:nth-child(7n+7) {
    background-color: rgb(86, 180, 233);
    box-shadow: 1px 1px 15px 15px rgba(86, 180, 233, 0.25);
    transform: translateY(2px);
  }
  /* Red: E(7n+3), G(7n+5) */
  piano .white-key.playing:nth-child(7n+3),
  piano .white-key.playing:nth-child(7n+5) {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }

  piano .white-key.sustained {
    background-color: rgb(144, 84, 77);
  }

  piano .white-key:hover:nth-child(7n+1),
  piano .white-key:hover:nth-child(7n+6) {
    background-color: rgb(247, 241, 160);
  }
  piano .white-key:hover:nth-child(7n+2),
  piano .white-key:hover:nth-child(7n+4),
  piano .white-key:hover:nth-child(7n+7) {
    background-color: rgb(170, 217, 244);
  }
  piano .white-key:hover:nth-child(7n+3),
  piano .white-key:hover:nth-child(7n+5) {
    background-color: rgb(247, 148, 171);
  }

  piano .white-key:active:nth-child(7n+1),
  piano .white-key:active:nth-child(7n+6) {
    background-color: rgb(239, 227, 65);
    box-shadow: 1px 1px 15px 15px rgba(239, 227, 65, 0.25);
    transform: translateY(2px);
  }
  piano .white-key:active:nth-child(7n+2),
  piano .white-key:active:nth-child(7n+4),
  piano .white-key:active:nth-child(7n+7) {
    background-color: rgb(86, 180, 233);
    box-shadow: 1px 1px 15px 15px rgba(86, 180, 233, 0.25);
    transform: translateY(2px);
  }
  piano .white-key:active:nth-child(7n+3),
  piano .white-key:active:nth-child(7n+5) {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }

  piano .black-key {
    z-index: 1;
    position: absolute;
    width: 1.8%;
    height: 100%;
    border: 1px inset rgb(92, 88, 88);
    background: rgb(20, 20, 20);
    border-radius: 3px;
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.47);
    pointer-events: auto;
  }

  /* Red: C#(5n+1), A#(5n+5) */
  piano .black-key.playing:nth-child(5n+1),
  piano .black-key.playing:nth-child(5n+5) {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }
  /* Yellow: D#(5n+2), F#(5n+3) */
  piano .black-key.playing:nth-child(5n+2),
  piano .black-key.playing:nth-child(5n+3) {
    background-color: rgb(239, 227, 65);
    box-shadow: 1px 1px 15px 15px rgba(239, 227, 65, 0.25);
    transform: translateY(2px);
  }
  /* Blue: G#(5n+4) */
  piano .black-key.playing:nth-child(5n+4) {
    background-color: rgb(86, 180, 233);
    box-shadow: 1px 1px 15px 15px rgba(86, 180, 233, 0.25);
    transform: translateY(2px);
  }

  piano .black-key.sustained {
    background-color: rgb(144, 84, 77);
  }

  piano .black-key:hover:nth-child(5n+1),
  piano .black-key:hover:nth-child(5n+5) {
    background-color: rgb(120, 20, 47);
  }
  piano .black-key:hover:nth-child(5n+2),
  piano .black-key:hover:nth-child(5n+3) {
    background-color: rgb(120, 113, 33);
  }
  piano .black-key:hover:nth-child(5n+4) {
    background-color: rgb(43, 90, 117);
  }

  piano .black-key:active:nth-child(5n+1),
  piano .black-key:active:nth-child(5n+5) {
    background-color: rgb(240, 41, 93);
    box-shadow: 1px 1px 15px 15px rgba(240, 41, 93, 0.25);
    transform: translateY(2px);
  }
  piano .black-key:active:nth-child(5n+2),
  piano .black-key:active:nth-child(5n+3) {
    background-color: rgb(239, 227, 65);
    box-shadow: 1px 1px 15px 15px rgba(239, 227, 65, 0.25);
    transform: translateY(2px);
  }
  piano .black-key:active:nth-child(5n+4) {
    background-color: rgb(86, 180, 233);
    box-shadow: 1px 1px 15px 15px rgba(86, 180, 233, 0.25);
    transform: translateY(2px);
  }
</style>
