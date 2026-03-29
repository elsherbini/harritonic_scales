# Skeleton UI Theme Integration

## Goal

Replace hand-styled Tailwind markup with Skeleton UI components and the Concord preset theme. Add a light/dark mode toggle.

## Setup

- Install `@skeletonlabs/skeleton` and `@skeletonlabs/skeleton-svelte` as dev dependencies
- Update `app.css` with Skeleton imports (tailwindcss, skeleton core, skeleton-svelte, concord theme)
- Add `data-theme="concord"` to `<html>` in `app.html`
- Replace `bg-gray-50` in layout with Skeleton surface tokens

## Component Mapping

| Current | Skeleton |
|---------|----------|
| Note toggle buttons (key root, target notes) | Chip tailwind classes (`preset-filled-*` / `preset-outlined-*`) |
| Major / Natural Minor buttons | Chip classes |
| "Something Else" select | Skeleton form select styling |
| Clear buttons | `btn preset-tonal-surface` |
| Scale result cards | `card preset-outlined-surface-200-800` |
| Section headings | Skeleton typography tokens (`h2`, `h3`) |
| Scale diagram | Unchanged — keeps own SVG colors + saturation logic |

## Dark Mode Toggle

- `Switch` component from `@skeletonlabs/skeleton-svelte` in top-right of page
- Toggles `dark` class on `<html>` (Tailwind selector strategy)
- On mount: check localStorage, fall back to `prefers-color-scheme`
- Persist preference to localStorage

## Not Doing

- No AppShell or Navigation — single-page app doesn't need it
- No toast, dialog, or other interactive components
- No custom theme — using concord as-is

## Files Changed

- `package.json` — two new dev dependencies
- `app.css` — Skeleton imports
- `app.html` — `data-theme` attribute
- `+layout.svelte` — surface background, dark mode toggle
- `+page.svelte` — all button/card/typography markup swapped to Skeleton classes
