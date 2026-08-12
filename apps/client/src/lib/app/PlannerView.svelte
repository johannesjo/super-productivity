<script lang="ts">
	import { scheduleOccurrences, selectWeekBuckets, weekDays } from '@noura/application';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RepeatIcon from '@lucide/svelte/icons/repeat-2';
	import { SvelteDate } from 'svelte/reactivity';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import type { ISODate } from '@noura/domain';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	const cursor = new SvelteDate();
	let mode = $state<'month' | 'week'>('week');
	let dragId: string | undefined;

	const key = (date: Date): ISODate => date.toISOString().slice(0, 10) as ISODate;
	const todayKey = $derived(key(new SvelteDate()));

	const weekStart = $derived.by(() => {
		const year = cursor.getFullYear();
		const month = cursor.getMonth();
		const date = cursor.getDate();
		const base = new Date(Date.UTC(year, month, date));
		const mondayOffset = (base.getUTCDay() + 6) % 7;
		return key(new Date(Date.UTC(year, month, date - mondayOffset)));
	});
	const weekEnd = $derived(weekDays(weekStart)[6]);
	const buckets = $derived(selectWeekBuckets(model.state, weekStart));
	const occurrences = $derived(scheduleOccurrences(model.state, weekStart, weekEnd));
	const unscheduled = $derived(
		model.allTasks.filter((task) => task.status === 'open' && !task.dueDay)
	);
	const weekLabel = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).formatRange(
			new Date(`${weekStart}T00:00:00`),
			new Date(`${weekEnd}T00:00:00`)
		)
	);

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

	const tasksFor = (date: Date) => model.allTasks.filter((task) => task.dueDay === key(date));
	function move(months: number): void {
		cursor.setFullYear(cursor.getFullYear(), cursor.getMonth() + months, 1);
	}
	function moveWeek(weeks: number): void {
		cursor.setDate(cursor.getDate() + weeks * 7);
	}

	function dragStart(event: DragEvent, id: string): void {
		dragId = id;
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	async function scheduleOn(day: ISODate): Promise<void> {
		const id = dragId;
		dragId = undefined;
		if (!id) return;
		const source = model.state.tasks[id];
		// move within a week = reschedule; dropping an "unscheduled" card = schedule
		if (source && source.dueDay !== day) await model.setTaskDay(id, day);
	}
</script>

<section class="planner" aria-labelledby="planner-title">
	<header>
		<div>
			<h1 id="planner-title">Planner</h1>
			<p>Plan by week with drag-to-schedule; repeat rules add recurring days.</p>
		</div>
		<div class="controls">
			<ToggleGroup.Root
				type="single"
				value={mode}
				onValueChange={(value) => (mode = value as 'month' | 'week')}
			>
				<ToggleGroup.Item value="week">Week</ToggleGroup.Item>
				<ToggleGroup.Item value="month">Month</ToggleGroup.Item>
			</ToggleGroup.Root>
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					cursor.setTime(Date.now());
					mode = 'week';
				}}>Today</Button
			><Button
				variant="ghost"
				size="icon"
				aria-label={mode === 'week' ? 'Previous week' : 'Previous month'}
				onclick={() => (mode === 'week' ? moveWeek(-1) : move(-1))}><ChevronLeftIcon /></Button
			><Button
				variant="ghost"
				size="icon"
				aria-label={mode === 'week' ? 'Next week' : 'Next month'}
				onclick={() => (mode === 'week' ? moveWeek(1) : move(1))}><ChevronRightIcon /></Button
			><Button size="sm" onclick={() => model.openTaskCapture({ dueDay: todayKey })}
				><PlusIcon data-icon="inline-start" />Add task</Button
			>
		</div>
	</header>

	{#if mode === 'week'}
		<div class="month-title">{weekLabel}</div>
		<div class="week-layout">
			<aside class="unscheduled" aria-label="Unscheduled tasks">
				<h2>Unscheduled</h2>
				{#if unscheduled.length}<div class="unscheduled-list">
						{#each unscheduled as task (task.id)}<button
								class="unscheduled-card"
								type="button"
								draggable="true"
								ondragstart={(event) => dragStart(event, task.id)}
								onclick={() => model.openTaskDetails(task.id)}>{task.title}</button
							>{/each}
					</div>{:else}<p class="none">Nothing left to schedule.</p>{/if}
			</aside>
			<div class="week-grid">
				<div class="week-head" aria-hidden="true">
					{#each buckets as bucket (bucket.date)}<span class:today={bucket.date === todayKey}
							>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
								new Date(`${bucket.date}T00:00:00`)
							)} <b>{Number(bucket.date.slice(8, 10))}</b></span
						>{/each}
				</div>
				<div class="week-board">
					{#each buckets as bucket (bucket.date)}<div
							class="week-day"
							class:today={bucket.date === todayKey}
							role="group"
							aria-label={`${bucket.date} day column`}
							ondragover={(event) => event.preventDefault()}
							ondrop={(event) => {
								event.preventDefault();
								void scheduleOn(bucket.date);
							}}
						>
							<Button
								variant="ghost"
								size="icon"
								class="add-day"
								aria-label={`Add task on ${bucket.date}`}
								onclick={() => model.openTaskCapture({ dueDay: bucket.date })}><PlusIcon /></Button
							>
							<div class="day-cards">
								{#each bucket.tasks as task (task.id)}<button
										type="button"
										class="day-card"
										draggable="true"
										ondragstart={(event) => dragStart(event, task.id)}
										onclick={() => model.openTaskDetails(task.id)}>{task.title}</button
									>{/each}
								{#each occurrences.filter((occurrence) => occurrence.date === bucket.date) as occurrence (occurrence.task.id)}
									<button
										type="button"
										class="day-card recurring"
										onclick={() => model.openTaskDetails(occurrence.task.id)}
										title="Recurring occurrence"><RepeatIcon />{occurrence.task.title}</button
									>{/each}
							</div>
						</div>{/each}
				</div>
			</div>
		</div>
	{:else}
		<div class="month-title">{label}</div>
		<div class="weekdays" aria-hidden="true">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day (day)}<span>{day}</span
				>{/each}
		</div>
		<div class="calendar-grid">
			{#each days as day (key(day))}
				<div
					class:outside={day.getMonth() !== cursor.getMonth()}
					class:today={key(day) === todayKey}
					class="day-cell"
					role="group"
					aria-label={`${key(day)} day cell`}
					ondragover={(event) => event.preventDefault()}
					ondrop={(event) => {
						event.preventDefault();
						void scheduleOn(key(day));
					}}
				>
					<div class="day-heading">
						<span>{day.getDate()}</span>
						<button
							type="button"
							aria-label={`Add task on ${key(day)}`}
							onclick={() => model.openTaskCapture({ dueDay: key(day) })}><PlusIcon /></button
						>
					</div>
					<div class="day-tasks">
						{#each tasksFor(day).slice(0, 3) as task (task.id)}<button
								type="button"
								draggable="true"
								ondragstart={(event) => dragStart(event, task.id)}
								onclick={() => model.openTaskDetails(task.id)}><i></i>{task.title}</button
							>{/each}
					</div>
					{#if tasksFor(day).length > 3}<Badge variant="secondary"
							>+{tasksFor(day).length - 3}</Badge
						>{/if}
				</div>
			{/each}
		</div>
	{/if}
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
		margin: 26px 0 15px;
		font-size: 14px;
		font-weight: 620;
	}
	.week-layout {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 18px;
		min-height: 60vh;
	}
	.unscheduled {
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--muted);
		align-self: start;
	}
	.unscheduled h2 {
		margin-bottom: 10px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.unscheduled-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.unscheduled-card {
		padding: 8px 9px;
		border: 1px dashed var(--border);
		border-radius: 8px;
		background: var(--background);
		font-size: 12px;
		text-align: left;
		cursor: grab;
	}
	.unscheduled .none {
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.week-grid {
		min-width: 0;
	}
	.week-head,
	.week-board {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 8px;
	}
	.week-head span {
		color: var(--muted-foreground);
		font-size: 10px;
		text-transform: uppercase;
	}
	.week-head span.today {
		color: var(--primary);
	}
	.week-head b {
		color: var(--foreground);
		font-size: 12px;
	}
	.week-day {
		position: relative;
		min-height: 340px;
		padding: 6px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--card);
	}
	.week-day.today {
		border-color: var(--primary);
	}
	:global(.add-day) {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		opacity: 0;
	}
	:global(.week-day:hover .add-day),
	:global(.add-day:focus-visible) {
		opacity: 1;
	}
	:global(.add-day svg) {
		width: 13px;
	}
	.day-cards {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-top: 16px;
	}
	.day-card {
		padding: 7px 8px;
		border-radius: 7px;
		background: var(--accent);
		font-size: 12px;
		text-align: left;
		cursor: grab;
	}
	.day-card.recurring {
		display: flex;
		align-items: center;
		gap: 6px;
		border: 1px dashed var(--primary);
		background: color-mix(in oklch, var(--primary) 12%, transparent);
		color: var(--foreground);
	}
	.day-card.recurring :global(svg) {
		width: 12px;
		color: var(--primary);
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
	.day-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.day-heading > span {
		display: grid;
		width: 24px;
		height: 24px;
		place-content: center;
		border-radius: 50%;
		font-size: 11px;
	}
	.day-cell.today .day-heading > span {
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.day-heading button {
		display: grid;
		width: 22px;
		height: 22px;
		place-content: center;
		border-radius: 6px;
		opacity: 0;
	}
	.day-cell:hover .day-heading button,
	.day-heading button:focus-visible {
		opacity: 1;
		background: var(--accent);
	}
	.day-heading button :global(svg) {
		width: 13px;
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
	@media (max-width: 1023px) {
		.week-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
