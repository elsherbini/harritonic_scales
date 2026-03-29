<script lang="ts">
  import '../app.css';
  import { Switch } from '@skeletonlabs/skeleton-svelte';
  import { browser } from '$app/environment';

  let { children } = $props();

  let dark = $state(false);

  // On mount: check localStorage, fall back to system preference
  if (browser) {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      dark = true;
    } else if (stored === 'light') {
      dark = false;
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  $effect(() => {
    if (!browser) return;
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
</script>

<div class="min-h-screen bg-surface-50-950">
  <header class="max-w-3xl mx-auto px-4 pt-4 flex justify-end">
    <Switch checked={dark} onCheckedChange={(e) => (dark = e.checked)}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>{dark ? 'Dark' : 'Light'}</Switch.Label>
      <Switch.HiddenInput />
    </Switch>
  </header>
  {@render children()}
</div>
