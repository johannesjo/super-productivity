<script lang="ts">
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	const recentTasks = $derived(
		model.allTasks.toSorted((left, right) => right.updatedAt - left.updatedAt).slice(0, 12)
	);
</script>

<Dialog.Root bind:open={model.activityOpen}>
	<Dialog.Content class="activity-dialog">
		<Dialog.Header>
			<Dialog.Title>Activity</Dialog.Title>
			<Dialog.Description>Recent local task changes</Dialog.Description>
		</Dialog.Header>
		<div class="activity-list">
			{#each recentTasks as task (task.id)}
				<button
					type="button"
					onclick={() => {
						void model.selectTask(task.id);
						model.activityOpen = false;
					}}
				>
					{#if task.status === 'done'}<CheckCircle2Icon />{:else}<Clock3Icon />{/if}
					<span
						><strong>{task.title}</strong><small>{new Date(task.updatedAt).toLocaleString()}</small
						></span
					>
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.activity-dialog) {
		width: min(520px, calc(100vw - 32px));
	}
	.activity-list {
		display: grid;
		max-height: 520px;
		overflow: auto;
		gap: 3px;
	}
	.activity-list button {
		display: grid;
		grid-template-columns: 20px 1fr;
		gap: 12px;
		align-items: center;
		padding: 10px;
		text-align: left;
		border-radius: 9px;
	}
	.activity-list button:hover,
	.activity-list button:focus-visible {
		background: var(--accent);
		outline: none;
	}
	.activity-list :global(svg) {
		width: 17px;
		color: var(--muted-foreground);
	}
	.activity-list span {
		display: grid;
		min-width: 0;
	}
	.activity-list strong {
		overflow: hidden;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.activity-list small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
</style>
