<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	export const inputGroupAddonVariants = tv({
		base: "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-2 py-2 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-3xl **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4 flex cursor-text items-center justify-center select-none",
		variants: {
			align: {
				'inline-start': 'pl-3 has-[>button]:-ml-1 has-[>kbd]:-ml-1 order-first',
				'inline-end': 'pr-3 has-[>button]:-mr-1 has-[>kbd]:-mr-1 order-last',
				'block-start':
					'px-3 pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5 order-first w-full justify-start',
				'block-end':
					'px-3 pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5 order-last w-full justify-start'
			}
		},
		defaultVariants: {
			align: 'inline-start'
		}
	});

	export type InputGroupAddonAlign = VariantProps<typeof inputGroupAddonVariants>['align'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		align = 'inline-start',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: InputGroupAddonAlign;
	} = $props();
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="input-group-addon"
	data-align={align}
	class={cn(inputGroupAddonVariants({ align }), className)}
	onclick={(e) => {
		if ((e.target as HTMLElement).closest('button')) {
			return;
		}
		e.currentTarget.parentElement?.querySelector('input')?.focus();
	}}
	{...restProps}
>
	{@render children?.()}
</div>
