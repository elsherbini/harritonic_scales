<script lang="ts">
  import svgRaw from '$lib/assets/scales-tagged.svg?raw';

  let { scaleSaturations }: { scaleSaturations: Map<string, number> } = $props();

  let container: HTMLDivElement;

  $effect(() => {
    if (!container) return;
    const shapes = container.querySelectorAll('[data-scale]');
    for (const el of shapes) {
      const name = el.getAttribute('data-scale')!;
      const saturation = scaleSaturations.get(name) ?? 0;
      (el as HTMLElement).style.filter = `saturate(${saturation})`;
    }
  });
</script>

<div class="scale-diagram" bind:this={container}>
  {@html svgRaw}
</div>

<style>
  .scale-diagram :global(svg) {
    width: 100%;
    height: auto;
    max-width: 600px;
    margin: 0 auto;
    display: block;
  }

  .scale-diagram :global([data-scale]) {
    transition: filter 0.2s;
  }

  .scale-diagram :global(path[stroke="#000000"]) {
    stroke: light-dark(var(--color-surface-950), var(--color-surface-50));
  }
</style>
