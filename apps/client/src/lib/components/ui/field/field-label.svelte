<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { cn } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: ComponentProps<typeof Label> = $props();
</script>

<Label
	bind:ref
	data-slot="field-label"
	class={cn(
		'group/field-label peer/field-label flex w-fit gap-2 leading-snug leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:bg-input/30 has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border *:data-[slot=field]:p-4',
		'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Label>
