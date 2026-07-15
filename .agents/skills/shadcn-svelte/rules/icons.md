# Icons

**Always use the project's configured `iconLibrary` for imports.** Check the `iconLibrary` field in `components.json`: `lucide` → `@lucide/svelte`, `tabler` → `@tabler/icons-svelte`, etc. Never assume `@lucide/svelte`.

---

## Icons in Button use data-icon attribute

Add `data-icon="inline-start"` (prefix) or `data-icon="inline-end"` (suffix) to the icon. No sizing classes on the icon.

**Incorrect:**

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
</script>

<Button>
  <SearchIcon class="mr-2 size-4" />
  Search
</Button>
```

**Correct:**

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
</script>

<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

<Button>
  Next
  <ArrowRightIcon data-icon="inline-end" />
</Button>
```

---

## No sizing classes on icons inside components

Components handle icon sizing via CSS. Don't add `size-4`, `w-4 h-4`, or other sizing classes to icons inside `<Button>`, `DropdownMenu.Item`, `Alert.Root`, `Sidebar.*`, or other shadcn-svelte components — unless the user explicitly asks for custom icon sizes.

**Incorrect:**

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
</script>

<Button>
  <SearchIcon class="size-4" data-icon="inline-start" />
  Search
</Button>
```

**Correct:**

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
</script>

<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>
```

The same applies to icons inside `DropdownMenu.Item`, sidebar items, and other menu rows — no extra sizing classes on the icon component.

---

## Pass icons as components, not string keys

Use a component reference, not a string key to a lookup map.

**Incorrect:**

```svelte
<!-- String key lookup — avoid -->
<DynamicIcon name="check" />
```

**Correct:**

```svelte
<script lang="ts">
  import type { Component } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";

  let { Icon }: { Icon: Component } = $props();
</script>

<Icon />

<!-- <StatusBadge Icon={CheckIcon} /> -->
```
