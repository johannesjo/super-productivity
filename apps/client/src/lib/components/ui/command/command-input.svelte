<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...restProps
	}: CommandPrimitive.InputProps = $props();
</script>

<div data-slot="command-input-wrapper" class="p-1 pb-0">
	<InputGroup.Root class="h-9 bg-input/50">
		<CommandPrimitive.Input
			{value}
			data-slot="command-input"
			class={cn(
				'w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...restProps}
		>
			{#snippet child({ props })}
				<InputGroup.Input {...props} bind:value bind:ref />
			{/snippet}
		</CommandPrimitive.Input>
		<InputGroup.Addon>
			<SearchIcon class="size-4 shrink-0 opacity-50" />
		</InputGroup.Addon>
	</InputGroup.Root>
</div>
