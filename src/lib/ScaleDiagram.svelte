<script lang="ts">
  import svgRaw from '$lib/assets/scales-tagged.svg?raw';

  let { scaleSaturations, onScaleClick }: {
    scaleSaturations: Map<string, number>;
    onScaleClick?: (scaleName: string) => void;
  } = $props();

  let container: HTMLDivElement;

  $effect(() => {
    if (!container) return;
    const shapes = container.querySelectorAll('[data-scale]');
    for (const el of shapes) {
      const name = el.getAttribute('data-scale')!;
      const saturation = scaleSaturations.get(name) ?? 0;
      const htmlEl = el as HTMLElement;
      if (saturation === 0) {
        htmlEl.style.filter = '';
        htmlEl.style.cursor = '';
        for (const child of el.querySelectorAll('[fill]:not([fill="none"])')) {
          (child as HTMLElement).style.fill = '#CCCCCC';
        }
      } else {
        htmlEl.style.filter = `saturate(${saturation})`;
        htmlEl.style.cursor = onScaleClick ? 'pointer' : '';
        for (const child of el.querySelectorAll('[fill]:not([fill="none"])')) {
          (child as HTMLElement).style.fill = '';
        }
      }
    }
  });

  function handleClick(e: MouseEvent) {
    if (!onScaleClick) return;
    const target = (e.target as Element).closest('[data-scale]');
    if (!target) return;
    const name = target.getAttribute('data-scale')!;
    const saturation = scaleSaturations.get(name) ?? 0;
    if (saturation > 0) {
      onScaleClick(name);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="scale-diagram" bind:this={container} onclick={handleClick}>
  {@html svgRaw}
</div>

<style>
  .scale-diagram :global(svg) {
    width: 100%;
    height: auto;
    max-width: 600px;
    margin: 0 auto;
    display: block;
    user-select: none;
  }

  .scale-diagram :global(text) {
    pointer-events: none;
  }

  .scale-diagram :global([data-scale]) {
    transition: filter 0.2s, fill 0.2s;
  }

  .scale-diagram :global(path[stroke="#000000"]) {
    stroke: light-dark(var(--color-surface-950), var(--color-surface-50));
  }
</style>
