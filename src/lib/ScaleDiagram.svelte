<script lang="ts">
  import svgRaw from '$lib/assets/scales-tagged.svg?raw';

  let { filteredScaleNames }: { filteredScaleNames: string[] } = $props();

  let container: HTMLDivElement;

  $effect(() => {
    if (!container) return;
    const filteredSet = new Set(filteredScaleNames);
    const shapes = container.querySelectorAll('[data-scale]');
    for (const el of shapes) {
      const name = el.getAttribute('data-scale')!;
      el.classList.toggle('dimmed', !filteredSet.has(name));
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

  .scale-diagram :global([data-scale].dimmed) {
    filter: saturate(0);
  }
</style>
