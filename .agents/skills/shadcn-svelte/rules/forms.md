# Forms & Inputs

## Contents

- Forms use Field.FieldGroup + Field.Field
- InputGroup requires InputGroup.Input/InputGroup.Textarea
- Buttons inside inputs use InputGroup.Root + InputGroup.Addon
- Option sets (2–7 choices) use ToggleGroup.Root + ToggleGroup.Item
- Field.FieldSet + Field.FieldLegend for grouping related fields
- Field validation and disabled states

---

## Forms use Field.FieldGroup + Field.Field

Always use `Field.FieldGroup` + `Field.Field` — never raw `div` with `space-y-*`:

```svelte
<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
</script>

<Field.FieldGroup>
  <Field.Field>
    <Field.FieldLabel for="email">Email</Field.FieldLabel>
    <Input id="email" type="email" />
  </Field.Field>
  <Field.Field>
    <Field.FieldLabel for="password">Password</Field.FieldLabel>
    <Input id="password" type="password" />
  </Field.Field>
</Field.FieldGroup>
```

Use `Field` with `orientation="horizontal"` for settings pages. Use `Field.FieldLabel` with `class="sr-only"` for visually hidden labels.

**Choosing form controls:**

- Simple text input → `Input`
- Dropdown with predefined options → `Select`
- Searchable dropdown → `Combobox`
- Native HTML select (no JS) → `native-select`
- Boolean toggle → `Switch` (for settings) or `Checkbox` (for forms)
- Single choice from few options → `RadioGroup`
- Toggle between 2–5 options → `ToggleGroup.Root` + `ToggleGroup.Item`
- OTP/verification code → `InputOTP`
- Multi-line text → `Textarea`

---

## InputGroup requires InputGroup.Input/InputGroup.Textarea

Never use raw `Input` or `Textarea` inside an `InputGroup.Root`.

**Incorrect:**

```svelte
<script lang="ts">
  import * as InputGroup from "$lib/components/ui/input-group";
  import { Input } from "$lib/components/ui/input";
</script>

<InputGroup.Root>
  <Input placeholder="Search..." />
</InputGroup.Root>
```

**Correct:**

```svelte
<script lang="ts">
  import * as InputGroup from "$lib/components/ui/input-group";
</script>

<InputGroup.Root>
  <InputGroup.Input placeholder="Search..." />
</InputGroup.Root>
```

---

## Buttons inside inputs use InputGroup.Root + InputGroup.Addon

Never place a `Button` directly inside or adjacent to an `Input` with custom positioning.

**Incorrect:**

```svelte
<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
</script>

<div class="relative">
  <Input placeholder="Search..." class="pr-10" />
  <Button class="absolute top-0 right-0" size="icon">
    <SearchIcon />
  </Button>
</div>
```

**Correct:**

```svelte
<script lang="ts">
  import * as InputGroup from "$lib/components/ui/input-group";
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
</script>

<InputGroup.Root>
  <InputGroup.Input placeholder="Search..." />
  <InputGroup.Addon>
    <Button size="icon">
      <SearchIcon data-icon="inline-start" />
    </Button>
  </InputGroup.Addon>
</InputGroup.Root>
```

---

## Option sets (2–7 choices) use ToggleGroup.Root + ToggleGroup.Item

Don't manually loop `Button` components with active state.

**Incorrect:**

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  let selected = $state("daily");
</script>

<div class="flex gap-2">
  {#each ["daily", "weekly", "monthly"] as option (option)}
    <Button
      variant={selected === option ? "default" : "outline"}
      onclick={() => (selected = option)}
    >
      {option}
    </Button>
  {/each}
</div>
```

**Correct:**

```svelte
<script lang="ts">
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  let selected = $state("daily");
</script>

<ToggleGroup.Root bind:value={selected} spacing={2}>
  <ToggleGroup.Item value="daily">Daily</ToggleGroup.Item>
  <ToggleGroup.Item value="weekly">Weekly</ToggleGroup.Item>
  <ToggleGroup.Item value="monthly">Monthly</ToggleGroup.Item>
</ToggleGroup.Root>
```

Combine with `Field` for labelled toggle groups:

```svelte
<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
</script>

<Field.Field orientation="horizontal">
  <Field.FieldTitle id="theme-label">Theme</Field.FieldTitle>
  <ToggleGroup.Root aria-labelledby="theme-label" spacing={2}>
    <ToggleGroup.Item value="light">Light</ToggleGroup.Item>
    <ToggleGroup.Item value="dark">Dark</ToggleGroup.Item>
    <ToggleGroup.Item value="system">System</ToggleGroup.Item>
  </ToggleGroup.Root>
</Field.Field>
```

---

## Field.FieldSet + Field.FieldLegend for grouping related fields

Use `Field.FieldSet` + `Field.FieldLegend` for related checkboxes, radios, or switches — not `div` with a heading:

```svelte
<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import { Checkbox } from "$lib/components/ui/checkbox";
</script>

<Field.FieldSet>
  <Field.FieldLegend variant="label">Preferences</Field.FieldLegend>
  <Field.FieldDescription>Select all that apply.</Field.FieldDescription>
  <Field.FieldGroup class="gap-3">
    <Field.Field orientation="horizontal">
      <Checkbox id="dark" />
      <Field.FieldLabel for="dark" class="font-normal"
        >Dark mode</Field.FieldLabel
      >
    </Field.Field>
  </Field.FieldGroup>
</Field.FieldSet>
```

---

## Field validation and disabled states

Both attributes are needed — `data-invalid`/`data-disabled` styles the field (label, description), while `aria-invalid`/`disabled` styles the control.

```svelte
<script lang="ts">
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
</script>

<!-- Invalid. -->
<Field.Field data-invalid>
  <Field.FieldLabel for="email">Email</Field.FieldLabel>
  <Input id="email" aria-invalid />
  <Field.FieldDescription>Invalid email address.</Field.FieldDescription>
</Field.Field>

<!-- Disabled. -->
<Field.Field data-disabled>
  <Field.FieldLabel for="email">Email</Field.FieldLabel>
  <Input id="email" disabled />
</Field.Field>
```

Works for all controls: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroupItem`, `Switch`, `Slider`, `NativeSelect`, `InputOTP`.
