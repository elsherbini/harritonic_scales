<script lang="ts">
  import { makeDimAbc } from '$lib/abc';

  let {
    abc = '',
    clef = 'treble',
    highlightIndex = null,
    diminishedColors = 'metaharmony',
  }: {
    abc?: string;
    clef?: 'treble' | 'diminished';
    highlightIndex?: number | null;
    diminishedColors?: 'metaharmony' | 'bw' | 'elements';
  } = $props();

  let containerEl: HTMLDivElement;
  let ABCJS: any = $state(null);

  // Dynamic import — abcjs uses window/document so can't load during SSR
  $effect(() => {
    import('abcjs').then(mod => {
      ABCJS = mod.default || mod;
    });
  });

  // Re-render when abc, clef, or ABCJS changes
  $effect(() => {
    if (!ABCJS || !containerEl) return;

    const abcToRender = clef === 'diminished' ? makeDimAbc(abc) : abc;

    ABCJS.renderAbc(containerEl, abcToRender, {
      responsive: 'resize',
      add_classes: true,
      ...(clef === 'diminished' ? { diminishedColors } : {}),
    });
  });

  // Highlight the current chord/note group
  $effect(() => {
    if (!containerEl) return;

    // Remove previous highlights
    containerEl.querySelectorAll('.abcjs-highlight').forEach(el => {
      el.classList.remove('abcjs-highlight');
    });

    if (highlightIndex === null || highlightIndex === undefined) return;

    // abcjs with add_classes adds .abcjs-note elements
    const noteGroups = containerEl.querySelectorAll('.abcjs-note');
    if (noteGroups[highlightIndex]) {
      noteGroups[highlightIndex].classList.add('abcjs-highlight');
    }
  });
</script>

<div class="staff-notation" bind:this={containerEl}></div>

<style>
  .staff-notation :global(svg) {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    display: block;
  }

  .staff-notation :global(.abcjs-highlight) {
    fill: rgb(240, 41, 93) !important;
  }
</style>
