<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { SvelteDate } from 'svelte/reactivity';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	const cursor = new SvelteDate();
	let label = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor)
	);
	let days = $derived.by(() => {
		const year = cursor.getFullYear();
		const month = cursor.getMonth();
		const first = new SvelteDate(year, month, 1);
		const start = new SvelteDate(year, month, 1 - first.getDay());
		return Array.from(
			{ length: 42 },
			(_, index) => new SvelteDate(start.getTime() + index * 86_400_000)
		);
	});

	const key = (date: Date): string => date.toISOString().slice(0, 10);
	const tasksFor = (date: Date) => model.allTasks.filter((task) => task.dueDay === key(date));
	function move(months: number): void {
		cursor.setFullYear(cursor.getFullYear(), cursor.getMonth() + months, 1);
	}
</script>

<section class="planner" aria-labelledby="planner-title">
	<header>
		<div>
			<h1 id="planner-title">Planner</h1>
			<p>Schedule tasks without leaving your local workspace.</p>
		</div>
		<div class="controls">
			<Button variant="outline" size="sm" onclick={() => cursor.setTime(Date.now())}>Today</Button
			><Button variant="ghost" size="icon" aria-label="Previous month" onclick={() => move(-1)}
				><ChevronLeftIcon /></Button
			><Button variant="ghost" size="icon" aria-label="Next month" onclick={() => move(1)}
				><ChevronRightIcon /></Button
			><Button size="sm"><PlusIcon data-icon="inline-start" />Add task</Button>
		</div>
	</header>
	<div class="month-title">{label}</div>
	<div class="weekdays" aria-hidden="true">
		{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day (day)}<span>{day}</span>{/each}
	</div>
	<div class="calendar-grid">
		{#each days as day (key(day))}
			<div
				class:outside={day.getMonth() !== cursor.getMonth()}
				class:today={key(day) === key(new SvelteDate())}
				class="day-cell"
			>
				<span>{day.getDate()}</span>
				<div class="day-tasks">
					{#each tasksFor(day).slice(0, 3) as task (task.id)}<button
							type="button"
							onclick={() => model.selectTask(task.id)}><i></i>{task.title}</button
						>{/each}
				</div>
				{#if tasksFor(day).length > 3}<Badge variant="secondary">+{tasksFor(day).length - 3}</Badge
					>{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.planner {
		height: 100%;
		overflow: auto;
		padding: 26px 28px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
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
	.controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.month-title {
		margin: 30px 0 15px;
		font-size: 15px;
		font-weight: 620;
	}
	.weekdays,
	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(110px, 1fr));
	}
	.weekdays span {
		padding: 0 10px 8px;
		color: var(--muted-foreground);
		font-size: 10px;
		text-transform: uppercase;
	}
	.calendar-grid {
		min-width: 770px;
		border-top: 1px solid var(--border);
		border-left: 1px solid var(--border);
	}
	.day-cell {
		min-height: 126px;
		padding: 8px;
		border-right: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}
	.day-cell > span {
		display: grid;
		width: 24px;
		height: 24px;
		place-content: center;
		border-radius: 50%;
		font-size: 11px;
	}
	.day-cell.today > span {
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.day-cell.outside {
		color: var(--muted-foreground);
		opacity: 0.48;
	}
	.day-tasks {
		display: flex;
		margin-top: 5px;
		flex-direction: column;
		gap: 3px;
	}
	.day-tasks button {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 6px;
		padding: 4px 5px;
		overflow: hidden;
		border-radius: 5px;
		background: var(--muted);
		font-size: 10px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.day-tasks i {
		width: 5px;
		height: 5px;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--primary);
	}
</style>
