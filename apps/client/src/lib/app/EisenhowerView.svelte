<script lang="ts">
	import { eisenhowerBuckets } from '@noura/application';
	import { Badge } from '$lib/components/ui/badge';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	const today = $derived(new Date().toISOString().slice(0, 10) as `${number}-${number}-${number}`);
	const buckets = $derived(eisenhowerBuckets(model.state, today));

	const quadrants = $derived.by(
		() =>
			[
				{
					id: 'importantUrgent',
					title: 'Do first',
					hint: 'Important · Urgent',
					list: buckets.importantUrgent,
					accent: 'red'
				},
				{
					id: 'importantNotUrgent',
					title: 'Schedule',
					hint: 'Important · Not urgent',
					list: buckets.importantNotUrgent,
					accent: 'blue'
				},
				{
					id: 'notImportantUrgent',
					title: 'Delegate',
					hint: 'Not important · Urgent',
					list: buckets.notImportantUrgent,
					accent: 'amber'
				},
				{
					id: 'notImportantNotUrgent',
					title: 'Eliminate',
					hint: 'Not important · Not urgent',
					list: buckets.notImportantNotUrgent,
					accent: 'neutral'
				}
			] as const
	);
</script>

<section class="eisenhower" aria-labelledby="eisenhower-title">
	<header>
		<h1 id="eisenhower-title">Eisenhower</h1>
		<p>Triage open tasks by importance (priority ≥ medium) and urgency (due within 2 days).</p>
	</header>
	<div class="matrix">
		{#each quadrants as quadrant (quadrant.id)}<section
				class="quadrant"
				class:accent={quadrant.accent}
				aria-labelledby={`q-${quadrant.id}`}
			>
				<div class="quad-head">
					<h2 id={`q-${quadrant.id}`}>{quadrant.title}</h2>
					<small>{quadrant.hint}</small>
					<Badge variant="outline">{quadrant.list.length}</Badge>
				</div>
				<ul>
					{#each quadrant.list as task (task.id)}<li>
							<button
								type="button"
								class:active={model.state.selectedTaskId === task.id}
								onclick={() => model.selectTask(task.id)}
							>
								<span class="task-dot" style={`--dot: var(--q-${quadrant.accent})`}></span><span
									class="task-title">{task.title}</span
								>
								{#if task.dueDay}<small>{task.dueDay}</small>{/if}
							</button>
						</li>{:else}<li class="none">No tasks here.</li>{/each}
				</ul>
			</section>{/each}
	</div>
</section>

<style>
	.eisenhower {
		height: 100%;
		overflow: auto;
		padding: 28px;
		background: var(--background);
	}
	header {
		margin-bottom: 20px;
	}
	h1 {
		font-size: 20px;
		letter-spacing: -0.02em;
	}
	header p {
		margin-top: 4px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.matrix {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.quadrant {
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px;
		background: var(--card);
	}
	.quad-head {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.quad-head h2 {
		font-size: 14px;
		font-weight: 640;
	}
	.quad-head small {
		flex: 1;
		color: var(--muted-foreground);
		font-size: 11px;
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-height: 120px;
	}
	.quadrant button {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 8px;
		padding: 7px 8px;
		border-radius: 8px;
		text-align: left;
		font-size: 13px;
	}
	.quadrant button:hover,
	.quadrant button.active {
		background: var(--accent);
	}
	.task-dot {
		width: 8px;
		height: 8px;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--dot);
	}
	.task-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.quadrant small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	li.none {
		padding: 8px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	:root {
		--q-red: #ef4444;
		--q-blue: #3b82f6;
		--q-amber: #f59e0b;
		--q-neutral: #6b7280;
	}
	@media (max-width: 767px) {
		.matrix {
			grid-template-columns: 1fr;
		}
	}
</style>
