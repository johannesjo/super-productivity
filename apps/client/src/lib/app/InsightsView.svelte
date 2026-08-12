<script lang="ts">
	import { focusSeries, topTasksByTime, weekFocus } from '@noura/application';
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
	const series = $derived(focusSeries(model.state, 14));
	const maxDay = $derived(Math.max(1, ...series.map((point) => point.minutes)));
	const weekly = $derived(weekFocus(model.state));
	const weekChange = $derived(
		weekly.prevWeekMs
			? Math.round(((weekly.thisWeekMs - weekly.prevWeekMs) / weekly.prevWeekMs) * 100)
			: 0
	);
	const topTasks = $derived(topTasksByTime(model.state, 5));
	const stats = $derived([
		{ label: 'Completed tasks', value: String(completed), icon: CheckCircleIcon },
		{ label: 'Open tasks', value: String(open), icon: TargetIcon },
		{ label: 'Tracked time', value: `${Math.round(tracked / 3_600_000)}h`, icon: ClockIcon },
		{ label: 'Completion rate', value: `${completion}%`, icon: ActivityIcon }
	]);

	const minutesLabel = (ms: number): string => {
		const minutes = Math.round(ms / 60_000);
		return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
	};
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
				><Card.Title>Focus timeline</Card.Title><Card.Description
					>Tracked minutes per day (last 14 days).</Card.Description
				></Card.Header
			><Card.Content
				><div class="focus-bars" role="img" aria-label="Bar chart of daily focus minutes">
					{#each series as point (point.date)}<div
							class="focus-col"
							title={`${point.date}: ${point.minutes}m`}
						>
							<div
								class="focus-bar"
								style={`height: ${point.minutes ? Math.max(8, Math.round((point.minutes / maxDay) * 100)) : 2}%`}
							></div>
							<small>{new Date(`${point.date}T00:00:00`).getDate()}</small>
						</div>{/each}
				</div></Card.Content
			></Card.Root
		>
		<Card.Root
			><Card.Header
				><Card.Title>This week</Card.Title><Card.Description
					>Movement versus the previous week.</Card.Description
				></Card.Header
			><Card.Content
				><div class="week-grid">
					<div>
						<small>Focused this week</small><strong>{minutesLabel(weekly.thisWeekMs)}</strong>
					</div>
					<div><small>Tasks completed</small><strong>{weekly.tasksDoneThisWeek}</strong></div>
					<div>
						<small>vs last week</small><strong class:down={weekChange < 0}
							>{weekChange === 0 ? '—' : `${weekChange > 0 ? '+' : ''}${weekChange}%`}</strong
						>
					</div>
				</div>
				<div class="legend"><span>This week</span><span>Last week</span></div></Card.Content
			></Card.Root
		>
		<Card.Root
			><Card.Header
				><Card.Title>Top tasks by time</Card.Title><Card.Description
					>Where the minutes went.</Card.Description
				></Card.Header
			><Card.Content
				><ul class="top-tasks">
					{#each topTasks as task (task.id)}<li>
							<span class="task-title">{task.title}</span><span class="task-time"
								>{minutesLabel(task.ms)}</span
							>
						</li>{:else}<li class="none">No tracked time yet.</li>{/each}
				</ul></Card.Content
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
	.focus-bars {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 120px;
	}
	.focus-col {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		height: 100%;
	}
	.focus-bar {
		width: 100%;
		max-width: 24px;
		border-radius: 5px 5px 0 0;
		background: linear-gradient(
			180deg,
			var(--primary),
			color-mix(in oklch, var(--primary) 60%, transparent)
		);
	}
	.focus-col small {
		color: var(--muted-foreground);
		font-size: 10px;
	}
	.week-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.week-grid div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.week-grid small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.week-grid strong {
		font-size: 18px;
		font-weight: 360;
		letter-spacing: -0.02em;
	}
	.week-grid strong.down {
		color: var(--destructive);
	}
	.legend {
		display: flex;
		justify-content: space-between;
		margin-top: 10px;
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.top-tasks {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.top-tasks li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 12px;
	}
	.top-tasks .task-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.top-tasks .task-time {
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}
	.top-tasks .none {
		color: var(--muted-foreground);
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
