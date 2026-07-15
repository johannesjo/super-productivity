---
name: shadcn-svelte
description: Manages shadcn-svelte components and projects — adding, updating, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn-svelte, the CLI, design-system presets, or any project with a components.json file. Also triggers for "shadcn-svelte init", "add component", or registry URLs.
user-invocable: false
allowed-tools: Bash(npx shadcn-svelte@latest *), Bash(pnpm dlx shadcn-svelte@latest *), Bash(bunx --bun shadcn-svelte@latest *)
---

# shadcn-svelte

A framework for building UI, components, and design systems for Svelte. Components are added as source to the user's project via the CLI.

> **IMPORTANT:** Run all CLI commands using the project's package runner: `npx shadcn-svelte@latest`, `pnpm dlx shadcn-svelte@latest`, or `bunx --bun shadcn-svelte@latest` — based on the project's package manager. Examples below use `npx shadcn-svelte@latest` but substitute the correct runner for the project.

## Current Project Context

Read `components.json` at the project root and, when you need the live file layout, list the directory given by the `aliases.ui` path (resolved with the same rules as the CLI).

## Imports (Svelte)

Each component lives in its own folder with an `index.ts` barrel. Match the [installation docs](https://shadcn-svelte.com/docs/installation):

- **Multi-part components** (dialog, select, card, field, tabs, …): `import * as Dialog from "$lib/components/ui/dialog"` then `Dialog.Content`, `Dialog.Title`, `Card.Root`, `Card.Header`, etc. — whatever the barrel exports (short names and/or `Root as …` aliases).
- **Single-component barrels** (only one meaningful component in the folder): **named imports** — `import { Button } from "$lib/components/ui/button"` and `<Button>`, not `import * as Button` + `Button.Root`. Same pattern for `{ Input }`, `{ Badge }`, `{ Spinner }`, `{ Checkbox }`, `{ Separator }`, `{ Skeleton }`, etc.

```ts
import * as Dialog from "$lib/components/ui/dialog";
import { Button } from "$lib/components/ui/button";
import { Separator } from "$lib/components/ui/separator";
```

Use the real aliases from `components.json` (often `$lib/components/ui/...`), not hardcoded paths.

## Principles

1. **Use existing components first.** Run `npx shadcn-svelte@latest add` with no arguments to browse available components, or check [Components](https://shadcn-svelte.com/docs/components) before writing custom UI.
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls. Dashboard = Sidebar + Card + Chart + Table.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.

## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`class` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand.** Not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **Use `cn()` for conditional classes.** Don't write manual template literal ternaries.
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `Field.FieldGroup` + `Field.Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroup.Input`/`InputGroup.Textarea`.** Never raw `Input`/`Textarea` inside `InputGroup.Root`.
- **Buttons inside inputs use `InputGroup.Root` + `InputGroup.Addon`.**
- **Option sets (2–7 choices) use `ToggleGroup`.** Don't loop `Button` with manual active state.
- **`Field.FieldSet` + `Field.FieldLegend` for grouping related checkboxes/radios.** Don't use a `div` with a heading.
- **Field validation uses `data-invalid` + `aria-invalid`.** `data-invalid` on `Field`, `aria-invalid` on the control. For disabled: `data-disabled` on `Field`, `disabled` on the control.

### Component Structure → [composition.md](./rules/composition.md)

- **Items always inside their Group.** `Select.Item` → `Select.Group`. `DropdownMenu.Item` → `DropdownMenu.Group`. `Command.Item` → `Command.Group`.
- **Custom triggers.** Wrap controls in `Dialog.Trigger` / `AlertDialog.Trigger`, or control open state with `bind:open` on the root — see component docs.
- **Dialog, Sheet, and Drawer always need a Title.** `Dialog.Title`, `Sheet.Title`, `Drawer.Title` required for accessibility. Use `class="sr-only"` if visually hidden.
- **Use full Card composition.** `Card.Header`/`Card.Title`/`Card.Description`/`Card.Content`/`Card.Footer`. Don't dump everything in `Card.Content`.
- **Button has no `isPending`/`isLoading`.** Compose with `Spinner` inside `Button` + `disabled`; use `data-icon="inline-start"` / `inline-end` on `Spinner` for correct spacing (`import { Button }`, `import { Spinner }`).
- **`Tabs.Trigger` must be inside `Tabs.List`.** Never render triggers directly in `Tabs`.
- **`Avatar` always needs `Avatar.Fallback`.** For when the image fails to load.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Toast via `svelte-sonner`.** Use `toast()` from `svelte-sonner` with the Sonner component from your UI folder.
- **Use `Separator`** instead of `<hr>` or a `div` with border-only classes.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.

### Icons → [icons.md](./rules/icons.md)

- **Icons in `<Button>` use `data-icon`.** `data-icon="inline-start"` or `data-icon="inline-end"` on the icon.
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS. No `size-4` or `w-4 h-4`.
- **Pass icons as components.** Import from the configured `iconLibrary` (e.g. `@lucide/svelte`), not string keys.

### CLI

- **Presets** — copy the encoded string from the design-system builder on [shadcn-svelte.com](https://shadcn-svelte.com) and pass it to `npx shadcn-svelte@latest init --preset <code>`.

## Key Patterns

These are the most common patterns that differentiate correct shadcn-svelte code. For edge cases, see the linked rule files above.

```svelte
<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { Badge } from "$lib/components/ui/badge";
  import * as Avatar from "$lib/components/ui/avatar";
</script>

<!-- Form layout: Field.FieldGroup + Field.Field, not div + Label. -->
<Field.FieldGroup>
  <Field.Field>
    <Field.FieldLabel for="email">Email</Field.FieldLabel>
    <Input id="email" />
  </Field.Field>
</Field.FieldGroup>

<!-- Validation: data-invalid on Field, aria-invalid on the control. -->
<Field.Field data-invalid>
  <Field.FieldLabel for="email">Email</Field.FieldLabel>
  <Input id="email" aria-invalid />
  <Field.FieldDescription>Invalid email.</Field.FieldDescription>
</Field.Field>

<!-- Icons in buttons: data-icon, no sizing classes. -->
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

<!-- Spacing: gap-*, not space-y-*. -->
<div class="flex flex-col gap-4"></div>

<!-- Equal dimensions: size-*, not w-* h-*. -->
<Avatar.Root class="size-10">
  <Avatar.Image src="/u.png" alt="User" />
  <Avatar.Fallback>U</Avatar.Fallback>
</Avatar.Root>

<!-- Status colors: Badge variants or semantic tokens, not raw colors. -->
<Badge variant="secondary">+20.1%</Badge>
```

## Component Selection

| Need                       | Use                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Button/action              | `Button` with appropriate variant (`import { Button }`)                                             |
| Form inputs                | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| Toggle between 2–5 options | `ToggleGroup.Root` + `ToggleGroup.Item`                                                             |
| Data display               | `Table`, `Card`, `Badge`, `Avatar`                                                                  |
| Navigation                 | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination`                                     |
| Overlays                   | `Dialog` (modal), `Sheet` (side panel), `Drawer` (bottom sheet), `AlertDialog` (confirmation)       |
| Feedback                   | `svelte-sonner` (toast), `Alert`, `Progress`, `Skeleton`, `Spinner`                                 |
| Command palette            | `Command` inside `Dialog`                                                                           |
| Charts                     | `Chart` (LayerChart)                                                                                |
| Layout                     | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible`                          |
| Empty states               | `Empty`                                                                                             |
| Menus                      | `DropdownMenu`, `ContextMenu`, `Menubar`                                                            |
| Tooltips/info              | `Tooltip`, `HoverCard`, `Popover`                                                                   |

## Key Fields

Use `components.json` and the filesystem — not a separate `info` command:

- **`aliases`** → use the actual alias prefix from config (e.g. `$lib/`), never hardcode unrelated projects.
- **`tailwind.css`** → the global CSS file where theme variables live. Edit this file for theme tweaks; don't add a second globals file unless the user already uses one.
- **`style`** → visual treatment (e.g. `nova`, `vega`, …) and registry style path.
- **`iconLibrary`** → determines icon packages (`@lucide/svelte`, `@tabler/icons-svelte`, etc.). Never assume `@lucide/svelte`.
- **`registry`** → where the CLI fetches components; default official registry at `shadcn-svelte.com`.
- **`resolvedPaths`** (conceptual) → the CLI resolves `aliases` to absolute paths; list `aliases.ui` on disk to see installed components.

See [cli.md](./cli.md) for commands and flags.

## Component Docs, Examples, and Usage

Open `https://shadcn-svelte.com/docs/components/<name>.md` for docs and examples. **When creating, fixing, debugging, or using a component, read the official page first** so you follow the documented APIs.

## Workflow

1. **Get project context** — read `components.json` and list the UI components directory when needed.
2. **Check installed components first** — before running `add`, list files under the resolved `ui` path. Don't import components that haven't been added, and don't re-add ones already present unless updating.
3. **Discover components** — `npx shadcn-svelte@latest add` with no arguments (interactive list), or the docs site.
4. **Install or update** — `npx shadcn-svelte@latest add <name>` or a registry **URL**. To refresh existing files from the registry, use `npx shadcn-svelte@latest update` (see [cli.md](./cli.md)).
5. **Fix imports in third-party / URL-added items** — After adding from a custom registry URL, check for hardcoded paths that don't match the project's `aliases`. Rewrite imports to use the project's `ui` / `lib` aliases from `components.json`.
6. **Review added components** — After adding, **read the added files** and verify composition (groups, titles, validation attrs). Align icon imports with `iconLibrary`.
7. **Remote registry items** — Adding by URL is explicit; if the user wants a component from an unknown source, confirm the registry URL or item before running `add`.

## Updating Components

Use the **`update`** command to pull the latest registry versions of components already in the project. Review changes with `git diff` after `update`.

1. Commit or stash local work.
2. Run `npx shadcn-svelte@latest update [component]` or `--all`.
3. Resolve merge conflicts if you had customized files.
4. **Never use `--overwrite` on `add` without the user's explicit approval** when it would destroy intentional edits.

## Quick Reference

```bash
# Initialize shadcn-svelte in your project.
npx shadcn-svelte@latest init

# Initialize with a preset string from the docs site builder.
npx shadcn-svelte@latest init --preset <code>

# Add components (interactive when run with no names).
npx shadcn-svelte@latest add
npx shadcn-svelte@latest add button card dialog
npx shadcn-svelte@latest add --all

# Update components already installed.
npx shadcn-svelte@latest update button
npx shadcn-svelte@latest update --all --yes

# Build a custom registry (registry authors).
npx shadcn-svelte@latest registry build
```

**Registry:** default `https://shadcn-svelte.com/registry` — override in `components.json` if needed.
**Docs:** [shadcn-svelte.com](https://shadcn-svelte.com)

## Detailed References

- [rules/forms.md](./rules/forms.md) — Field.FieldGroup, Field.Field, InputGroup, ToggleGroup, Field.FieldSet, validation states
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, Tabs, Avatar, Alert, Empty, Toast, Separator, Skeleton, Badge, Button loading
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing, passing icon components
- [rules/styling.md](./rules/styling.md) — Semantic colors, variants, class, spacing, size, truncate, dark mode, cn(), z-index
- [cli.md](./cli.md) — Commands, flags, registry
- [customization.md](./customization.md) — Theming, CSS variables, extending components
