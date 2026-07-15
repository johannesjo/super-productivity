# Component Composition

## Contents

- Items always inside their Group component
- Callouts use Alert
- Empty states use Empty component
- Toast notifications use svelte-sonner
- Choosing between overlay components
- Dialog, Sheet, and Drawer always need a Title
- Card structure
- Button has no isPending or isLoading prop
- Tabs.Trigger must be inside Tabs.List
- Avatar always needs Avatar.Fallback
- Use Separator instead of raw hr or border divs
- Use Skeleton for loading placeholders
- Use Badge instead of custom styled spans

---

## Items always inside their Group component

Never render items directly inside the content container.

**Incorrect:**

```svelte
<script lang="ts">
  import * as Select from "$lib/components/ui/select";
</script>

<Select.Content>
  <Select.Item value="apple">Apple</Select.Item>
  <Select.Item value="banana">Banana</Select.Item>
</Select.Content>
```

**Correct:**

```svelte
<script lang="ts">
  import * as Select from "$lib/components/ui/select";
</script>

<Select.Content>
  <Select.Group>
    <Select.Item value="apple">Apple</Select.Item>
    <Select.Item value="banana">Banana</Select.Item>
  </Select.Group>
</Select.Content>
```

This applies to all group-based components:

| Item                                                          | Group                |
| ------------------------------------------------------------- | -------------------- |
| `Select.Item`, `Select.Label`                                 | `Select.Group`       |
| `DropdownMenu.Item`, `DropdownMenu.Label`, `DropdownMenu.Sub` | `DropdownMenu.Group` |
| `Menubar.Item`                                                | `Menubar.Group`      |
| `ContextMenu.Item`                                            | `ContextMenu.Group`  |
| `Command.Item`                                                | `Command.Group`      |

---

## Callouts use Alert

```svelte
<script lang="ts">
  import * as Alert from "$lib/components/ui/alert";
</script>

<Alert.Root>
  <Alert.Title>Warning</Alert.Title>
  <Alert.Description>Something needs attention.</Alert.Description>
</Alert.Root>
```

---

## Empty states use Empty component

```svelte
<script lang="ts">
  import * as Empty from "$lib/components/ui/empty";
  import { Button } from "$lib/components/ui/button";
  import FolderIcon from "@lucide/svelte/icons/folder";
</script>

<Empty.Root>
  <Empty.Header>
    <Empty.Media variant="icon"><FolderIcon /></Empty.Media>
    <Empty.Title>No projects yet</Empty.Title>
    <Empty.Description
      >Get started by creating a new project.</Empty.Description
    >
  </Empty.Header>
  <Empty.Content>
    <Button>Create Project</Button>
  </Empty.Content>
</Empty.Root>
```

---

## Toast notifications use svelte-sonner

```svelte
<script lang="ts">
  import { toast } from "svelte-sonner";
</script>
```

```ts
toast.success("Changes saved.");
toast.error("Something went wrong.");
toast("File deleted.", {
  action: { label: "Undo", onClick: () => undoDelete() },
});
```

Mount the `Toaster` from your UI folder once in the app layout (see [Sonner](https://shadcn-svelte.com/docs/components/sonner)).

---

## Choosing between overlay components

| Use case                           | Component     |
| ---------------------------------- | ------------- |
| Focused task that requires input   | `Dialog`      |
| Destructive action confirmation    | `AlertDialog` |
| Side panel with details or filters | `Sheet`       |
| Mobile-first bottom panel          | `Drawer`      |
| Quick info on hover                | `HoverCard`   |
| Small contextual content on click  | `Popover`     |

---

## Dialog, Sheet, and Drawer always need a Title

`Dialog.Title`, `Sheet.Title`, `Drawer.Title` are required for accessibility. Use `class="sr-only"` if visually hidden.

```svelte
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
</script>

<Dialog.Content>
  <Dialog.Header>
    <Dialog.Title>Edit Profile</Dialog.Title>
    <Dialog.Description>Update your profile.</Dialog.Description>
  </Dialog.Header>
  ...
</Dialog.Content>
```

---

## Card structure

Use full composition — don't dump everything into `Card.Content`:

```svelte
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Team Members</Card.Title>
    <Card.Description>Manage your team.</Card.Description>
  </Card.Header>
  <Card.Content>...</Card.Content>
  <Card.Footer>
    <Button>Invite</Button>
  </Card.Footer>
</Card.Root>
```

---

## Button has no isPending or isLoading prop

Compose with `Spinner` inside `Button` + `disabled`:

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
</script>

<Button disabled>
  <Spinner data-icon="inline-start" />
  Saving...
</Button>
```

---

## Tabs.Trigger must be inside Tabs.List

Never render `Tabs.Trigger` directly inside `Tabs.Root` — always wrap in `Tabs.List`:

```svelte
<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs";
  let tab = $state("account");
</script>

<Tabs.Root bind:value={tab}>
  <Tabs.List>
    <Tabs.Trigger value="account">Account</Tabs.Trigger>
    <Tabs.Trigger value="password">Password</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account">...</Tabs.Content>
</Tabs.Root>
```

---

## Avatar always needs Avatar.Fallback

Always include `Avatar.Fallback` for when the image fails to load:

```svelte
<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
</script>

<Avatar.Root>
  <Avatar.Image src="/avatar.png" alt="User" />
  <Avatar.Fallback>JD</Avatar.Fallback>
</Avatar.Root>
```

---

## Use existing components instead of custom markup

| Instead of                                     | Use                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `<hr>` or `<div class="border-t">`             | `<Separator />` (`import { Separator } from "$lib/components/ui/separator"`)                |
| `<div class="animate-pulse">` with styled divs | `<Skeleton class="h-4 w-3/4" />` (`import { Skeleton } from "$lib/components/ui/skeleton"`) |
| `<span class="rounded-full bg-green-100 ...">` | `<Badge variant="secondary">` (`import { Badge } from "$lib/components/ui/badge"`)          |
