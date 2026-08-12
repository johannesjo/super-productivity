<script lang="ts">
	import { buildWorklogRows, recentHistory, worklogToCsv } from '@noura/application';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import { Button } from '$lib/components/ui/button';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	const doneTasks = $derived(
		Object.values(model.state.tasks)
			.filter((task) => task.status === 'done')
			.sort((a, b) => (b.doneOn ?? 0) - (a.doneOn ?? 0))
	);
	const series = $derived(recentHistory(model.state, 14));
	const maxDone = $derived(Math.max(1, ...series.map((day) => day.tasksDone)));
	const rows = $derived(buildWorklogRows(model.state));
	const totalMs = $derived(rows.reduce((total, row) => total + row.durationMs, 0));

	const formatDuration = (ms: number): string => {
		const minutes = Math.round(ms / 60_000);
		if (minutes < 60) return `${minutes}m`;
		return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	};
	const formatDay = (iso: string): string =>
		new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(
			new Date(`${iso}T00:00:00`)
		);
	const doneLabel = (ms: number): string => formatDay(new Date(ms).toISOString().slice(0, 10));

	function exportCsv(): void {
		const csv = worklogToCsv(rows);
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `noura-timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="history-view" aria-labelledby="history-title">
	<header>
		<div>
			<h1 id="history-title">History</h1>
			<p>Completed work, daily totals, and a hands-off timesheet.</p>
		</div>
		<div class="controls">
			<Button variant="outline" size="sm" onclick={exportCsv}><DownloadIcon /> Export CSV</Button>
		</div>
	</header>

	<div class="chart-card">
		<h2>Completed per day (14 days)</h2>
		<div class="bars" role="img" aria-label="Bar chart of completed tasks per day">
			{#each series as day (day.date)}<div
					class="bar-col"
					title={`${day.date}: ${day.tasksDone} done`}
				>
					<div class="bar" style={`height: ${Math.round((day.tasksDone / maxDone) * 100)}%`}></div>
					<small>{new Date(`${day.date}T00:00:00`).getDate()}</small>
				</div>{/each}
		</div>
	</div>

	<div class="grid">
		<section class="panel" aria-labelledby="done-title">
			<h2 id="done-title"><ListChecksIcon /> Completed tasks</h2>
			{#if doneTasks.length}<ul class="done-list">
					{#each doneTasks as task (task.id)}<li>
							<span class="done-date">{task.doneOn ? doneLabel(task.doneOn) : ''}</span>
							<span class="done-title">{task.title}</span>
							<small>{model.state.projects[task.projectId]?.title}</small>
						</li>{/each}
				</ul>{:else}<p class="empty">Nothing completed yet.</p>{/if}
		</section>

		<section class="panel" aria-labelledby="worklog-title">
			<h2 id="worklog-title"><TimerIcon /> Timesheet <small>{formatDuration(totalMs)}</small></h2>
			{#if rows.length}<table class="worklog">
					<thead>
						<tr><th>Day</th><th>Task</th><th>Project</th><th class="num">Time</th></tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}<tr>
								<td>{row.date ? formatDay(row.date) : ''}</td>
								<td>{row.taskTitle}</td>
								<td>{row.projectTitle}</td>
								<td class="num">{formatDuration(row.durationMs)}</td>
							</tr>{/each}
					</tbody>
				</table>{:else}<p class="empty">
					Start a focus or tracking session to build the timesheet.
				</p>{/if}
		</section>
	</div>
</section>

<style>
	.history-view {
		height: 100%;
		overflow: auto;
		padding: 28px;
		background: var(--background);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 22px;
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
	.controls {
		display: flex;
		gap: 8px;
	}
	.controls :global(svg) {
		width: 15px;
	}
	.chart-card,
	.panel {
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 18px;
		background: var(--card);
	}
	.chart-card {
		margin-bottom: 20px;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
		font-size: 13px;
		font-weight: 640;
	}
	h2 :global(svg) {
		width: 15px;
		color: var(--muted-foreground);
	}
	h2 small {
		margin-left: auto;
		color: var(--muted-foreground);
		font-weight: 500;
	}
	.bars {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 120px;
	}
	.bar-col {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		height: 100%;
	}
	.bar {
		width: 100%;
		max-width: 26px;
		border-radius: 5px 5px 0 0;
		background: var(--primary);
		opacity: 0.85;
	}
	.bar-col small {
		color: var(--muted-foreground);
		font-size: 10px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 20px;
	}
	.done-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 340px;
		overflow: auto;
	}
	.done-list li {
		display: grid;
		grid-template-columns: 96px 1fr auto;
		align-items: center;
		gap: 10px;
		font-size: 13px;
	}
	.done-date {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.done-list small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.empty {
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.worklog {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}
	.worklog th,
	.worklog td {
		padding: 7px 8px;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}
	.worklog th {
		color: var(--muted-foreground);
		font-weight: 600;
	}
	.worklog .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 959px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
