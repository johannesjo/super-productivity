<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...props
	}: ComponentProps<typeof Input> = $props();
</script>

<Input
	bind:ref
	data-slot="input-group-control"
	class={cn(
		'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
		className
	)}
	bind:value
	{...props}
/>
