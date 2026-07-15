<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLLiAttributes } from 'svelte/elements';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li
	bind:this={ref}
	data-slot="breadcrumb-separator"
	role="presentation"
	aria-hidden="true"
	class={cn('[&>svg]:size-3.5', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		<ChevronRightIcon />
	{/if}
</li>
