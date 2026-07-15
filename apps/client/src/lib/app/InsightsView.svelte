<script lang="ts">
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import CheckCircleIcon from '@lucide/svelte/icons/circle-check-big';
	import ClockIcon from '@lucide/svelte/icons/clock-3';
	import TargetIcon from '@lucide/svelte/icons/target';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let completed = $derived(model.allTasks.filter((task) => task.status === 'done').length);
	let open = $derived(model.allTasks.filter((task) => task.status === 'open').length);
	let tracked = $derived(model.allTasks.reduce((sum, task) => sum + task.trackedMs, 0));
	let completion = $derived(
		model.allTasks.length ? Math.round((completed / model.allTasks.length) * 100) : 0
	);
	const stats = $derived([
		{ label: 'Completed tasks', value: String(completed), icon: CheckCircleIcon },
		{ label: 'Open tasks', value: String(open), icon: TargetIcon },
		{ label: 'Tracked time', value: `${Math.round(tracked / 3_600_000)}h`, icon: ClockIcon },
		{ label: 'Completion rate', value: `${completion}%`, icon: ActivityIcon }
	]);
</script>

<section class="insights" aria-labelledby="insights-title">
	<header>
		<h1 id="insights-title">Insights</h1>
		<p>A private summary computed entirely from local data.</p>
	</header>
	<div class="stat-grid">
		{#each stats as stat (stat.label)}<Card.Root
				><Card.Header
					><stat.icon /><Card.Description>{stat.label}</Card.Description><Card.Title
						>{stat.value}</Card.Title
					></Card.Header
				></Card.Root
			>{/each}
	</div>
	<div class="insight-grid">
		<Card.Root
			><Card.Header
				><Card.Title>Task completion</Card.Title><Card.Description
					>All-time completion across the current local workspace.</Card.Description
				></Card.Header
			><Card.Content
				><div class="completion-number">{completion}%</div>
				<Progress value={completion} />
				<div class="legend">
					<span>{completed} completed</span><span>{open} open</span>
				</div></Card.Content
			></Card.Root
		>
		<Card.Root
			><Card.Header
				><Card.Title>Focus distribution</Card.Title><Card.Description
					>Tracked time by project.</Card.Description
				></Card.Header
			><Card.Content
				><div class="project-bars">
					{#each model.projects as project (project.id)}{@const amount = model.allTasks
							.filter((task) => task.projectId === project.id)
							.reduce((sum, task) => sum + task.trackedMs, 0)}
						<div>
							<span>{project.title}</span><Progress
								value={tracked ? Math.round((amount / tracked) * 100) : 0}
							/>
						</div>{/each}
				</div></Card.Content
			></Card.Root
		>
	</div>
</section>

<style>
	.insights {
		height: 100%;
		overflow: auto;
		padding: 26px 28px;
	}
	h1 {
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	header p {
		margin-top: 4px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
		margin-top: 30px;
	}
	.stat-grid :global(svg) {
		width: 18px;
		color: var(--primary);
	}
	.insight-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
		margin-top: 18px;
	}
	.completion-number {
		margin-bottom: 16px;
		font-size: 42px;
		font-weight: 350;
		letter-spacing: -0.05em;
	}
	.legend {
		display: flex;
		justify-content: space-between;
		margin-top: 10px;
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.project-bars {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.project-bars div {
		display: grid;
		grid-template-columns: 90px 1fr;
		align-items: center;
		gap: 12px;
		font-size: 11px;
	}
	@media (max-width: 900px) {
		.stat-grid {
			grid-template-columns: 1fr 1fr;
		}
		.insight-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
