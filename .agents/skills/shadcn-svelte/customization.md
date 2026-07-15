# Customization & Theming

Components reference semantic CSS variable tokens. Change the variables to change every component.

## Contents

- How it works (CSS variables → Tailwind utilities → components)
- Color variables and OKLCH format
- Dark mode setup
- Changing the theme (presets, CSS variables)
- Adding custom colors (Tailwind v3 and v4)
- Border radius
- Customizing components (variants, class, wrappers)
- Checking for updates

---

## How It Works

1. CSS variables defined in `:root` (light) and `.dark` (dark mode).
2. Tailwind maps them to utilities: `bg-primary`, `text-muted-foreground`, etc.
3. Components use these utilities — changing a variable changes all components that reference it.

---

## Color Variables

Every color follows the `name` / `name-foreground` convention. The base variable is for backgrounds, `-foreground` is for text/icons on that background.

| Variable                                     | Purpose                          |
| -------------------------------------------- | -------------------------------- |
| `--background` / `--foreground`              | Page background and default text |
| `--card` / `--card-foreground`               | Card surfaces                    |
| `--primary` / `--primary-foreground`         | Primary buttons and actions      |
| `--secondary` / `--secondary-foreground`     | Secondary actions                |
| `--muted` / `--muted-foreground`             | Muted/disabled states            |
| `--accent` / `--accent-foreground`           | Hover and accent states          |
| `--destructive` / `--destructive-foreground` | Error and destructive actions    |
| `--border`                                   | Default border color             |
| `--input`                                    | Form input borders               |
| `--ring`                                     | Focus ring color                 |
| `--chart-1` through `--chart-5`              | Chart/data visualization         |
| `--sidebar-*`                                | Sidebar-specific colors          |
| `--surface` / `--surface-foreground`         | Secondary surface                |

Colors use OKLCH: `--primary: oklch(0.205 0 0)` where values are lightness (0–1), chroma (0 = gray), and hue (0–360).

---

## Dark Mode

Class-based toggle via `.dark` on the root element. In SvelteKit, use [mode-watcher](https://github.com/svecosystem/mode-watcher) (see [Dark mode — Svelte](https://shadcn-svelte.com/docs/dark-mode/svelte)):

```svelte
<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  let { children } = $props();
</script>

<ModeWatcher />
{@render children?.()}
```

---

## Changing the Theme

Use a **preset** from the design-system builder on [shadcn-svelte.com](https://shadcn-svelte.com) and pass it to `init`:

```bash
npx shadcn-svelte@latest init --preset <code>
```

Or edit CSS variables directly in the file set in `components.json` as `tailwind.css` (for example `src/app.css`).

To align config and components with a new preset, re-run `init` with `--preset` and confirm overwrites when prompted.

---

## Adding Custom Colors

Add variables to the global CSS file path in `components.json` (`tailwind.css`). Do not create a second global CSS file for theming unless the project already uses that pattern.

```css
/* 1. Define in the global CSS file. */
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}
.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}
```

```css
/* 2a. Register with Tailwind v4 (@theme inline). */
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

On Tailwind v3, register in `tailwind.config.js` (see the [Tailwind v3 docs](https://tw3.shadcn-svelte.com) if you maintain a legacy setup):

```js
// 2b. Register with Tailwind v3 (tailwind.config.js).
module.exports = {
  theme: {
    extend: {
      colors: {
        warning: "oklch(var(--warning) / <alpha-value>)",
        "warning-foreground":
          "oklch(var(--warning-foreground) / <alpha-value>)",
      },
    },
  },
};
```

```svelte
<!-- 3. Use in components. -->
<div class="bg-warning text-warning-foreground">Warning</div>
```

---

## Border Radius

`--radius` controls border radius globally. Components derive values from it (`rounded-lg` = `var(--radius)`, `rounded-md` = `calc(var(--radius) - 2px)`).

---

## Customizing Components

See also: [rules/styling.md](./rules/styling.md) for Incorrect/Correct examples.

Prefer these approaches in order:

### 1. Built-in variants

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
</script>

<Button variant="outline" size="sm">Click</Button>
```

### 2. Tailwind classes via `class`

```svelte
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
</script>

<Card.Root class="mx-auto max-w-md">
  <Card.Content>...</Card.Content>
</Card.Root>
```

### 3. Add a new variant

Edit the component source to add a variant via `tailwind-variants` / `cva` in the `.svelte` or shared variants file:

```ts
// e.g. in button variants
warning: "bg-warning text-warning-foreground hover:bg-warning/90",
```

### 4. Wrapper components

Compose shadcn-svelte primitives into higher-level `.svelte` files:

```svelte
<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  let { title, description, onConfirm, children } = $props();
  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger>
    {@render children?.()}
  </AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>{description}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => {
          onConfirm?.();
          open = false;
        }}>Confirm</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

---

## Checking for Updates

```bash
npx shadcn-svelte@latest update button
npx shadcn-svelte@latest update --all
```

See [Updating Components in SKILL.md](./SKILL.md#updating-components). Review `git diff` after `update` to see what changed.
