<script lang="ts">
  import { makeDimAbc } from '$lib/abc';

  let {
    abc = '',
    clef = 'treble',
    highlightIndex = null,
    diminishedColors = 'metaharmony',
    noteGroups,
    onNoteClick,
  }: {
    abc?: string;
    clef?: 'treble' | 'diminished';
    highlightIndex?: number | null;
    diminishedColors?: 'metaharmony' | 'bw' | 'elements';
    noteGroups?: string[][];
    onNoteClick?: (notes: string[]) => void;
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
      staffwidth: 700,
      scale: 1.5,
      add_classes: true,
      ...(clef === 'diminished' ? { diminishedColors } : {}),
      clickListener: onNoteClick ? (abcElem: any) => {
        if (!noteGroups || abcElem.el_type !== 'note') return;
        // Count note tokens in the ABC body before startChar to find the index
        const bodyStart = abcToRender.lastIndexOf('\n') + 1;
        const before = abcToRender.substring(bodyStart, abcElem.startChar);
        let idx = 0;
        let i = 0;
        while (i < before.length) {
          if (before[i] === '[') {
            const end = before.indexOf(']', i);
            if (end !== -1) { idx++; i = end + 1; } else i++;
          } else if (/[A-Ga-g]/.test(before[i])) {
            idx++;
            i++;
            while (i < before.length && /[,']/.test(before[i])) i++;
          } else {
            i++;
          }
        }
        const notes = noteGroups[idx];
        if (notes) {
          console.log('Staff click — index:', idx, 'notes:', notes);
          onNoteClick(notes);
        }
      } : undefined,
    });
  });

  // Cursor line: vertical red line spanning the staff at the active note
  $effect(() => {
    if (!containerEl) return;

    const svg = containerEl.querySelector('svg');
    if (!svg) return;

    // Remove existing cursor line
    svg.querySelector('.abcjs-cursor-line')?.remove();

    if (highlightIndex === null || highlightIndex === undefined || highlightIndex < 0) return;

    const noteGroups = svg.querySelectorAll('.abcjs-note');
    const noteEl = noteGroups[highlightIndex];
    if (!noteEl) return;

    // Get the note's position within the SVG coordinate space
    const noteBBox = (noteEl as SVGGraphicsElement).getBBox();

    // Find the staff lines to get vertical extent
    const staffLines = svg.querySelectorAll('.abcjs-staff path[d]');
    let staffTop = Infinity;
    let staffBottom = -Infinity;
    staffLines.forEach(line => {
      const bbox = (line as SVGGraphicsElement).getBBox();
      staffTop = Math.min(staffTop, bbox.y);
      staffBottom = Math.max(staffBottom, bbox.y + bbox.height);
    });

    // Extend a bit beyond the staff (one staff-space above and below)
    const staffHeight = staffBottom - staffTop;
    const margin = staffHeight * 0.3;
    const lineTop = staffTop - margin;
    const lineBottom = staffBottom + margin;

    // Position line at the center-x of the note
    const x = noteBBox.x + noteBBox.width / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('abcjs-cursor-line');
    line.setAttribute('x1', String(x));
    line.setAttribute('x2', String(x));
    line.setAttribute('y1', String(lineTop));
    line.setAttribute('y2', String(lineBottom));
    svg.appendChild(line);
  });
</script>

<div class="staff-notation" bind:this={containerEl}></div>

<style>
  .staff-notation :global(svg) {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    display: block;
  }

  .staff-notation :global(.abcjs-cursor-line) {
    stroke: rgb(240, 41, 93);
    stroke-width: 2;
    stroke-opacity: 0.8;
  }
</style>
