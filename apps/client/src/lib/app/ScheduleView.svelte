<script lang="ts">
	import { selectWeekBuckets } from '@noura/application';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from '$lib/components/ui/button';
	import type { ISODate } from '@noura/domain';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	const today = $derived(new Date().toISOString().slice(0, 10) as ISODate);
	const tomorrow = $derived(
		new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) as ISODate
	);
	const weekStart = $derived.by(() => {
		const date = new Date(`${today}T00:00:00Z`);
		const offset = (date.getUTCDay() + 6) % 7;
		return new Date(date.getTime() - offset * 86_400_000).toISOString().slice(0, 10) as ISODate;
	});
	const week = $derived(selectWeekBuckets(model.state, weekStart));
	const inbox = $derived(model.allTasks.filter((task) => task.status === 'open' && !task.dueDay));
	const overdue = $derived(
		model.allTasks.filter(
			(task) => task.status === 'open' && task.dueDay !== undefined && task.dueDay < today
		)
	);
	const todayTasks = $derived(
		model.allTasks.filter((task) => task.status === 'open' && task.dueDay === today)
	);
	const nextWeekCount = $derived(
		model.allTasks.filter(
			(task) =>
				task.status === 'open' &&
				task.dueDay !== undefined &&
				task.dueDay > week[6].date &&
				task.dueDay <=
					new Date(Date.parse(`${week[6].date}T00:00:00Z`) + 7 * 86_400_000)
						.toISOString()
						.slice(0, 10)
		).length
	);

	const fmtDay = (iso: string): string =>
		new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(
			new Date(`${iso}T00:00:00`)
		);
	let dragId: string | undefined;

	function dragStart(event: DragEvent, id: string): void {
		dragId = id;
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}
	async function scheduleOn(day: ISODate): Promise<void> {
		const id = dragId;
		dragId = undefined;
		if (id) await model.setTaskDay(id, day);
	}
</script>

<section class="schedule" aria-labelledby="schedule-title">
	<header>
		<div>
			<h1 id="schedule-title">Schedule</h1>
			<p>Plan the day and the week, pulling from a planning inbox.</p>
		</div>
		<Button size="sm" onclick={() => model.openTaskCapture({ dueDay: today })}
			><PlusIcon data-icon="inline-start" />Add task today</Button
		>
	</header>
	<div class="schedule-layout">
		<aside class="inbox" aria-label="Planning inbox">
			<h2><InboxIcon /> Planning inbox</h2>
			{#if inbox.length}<ul class="inbox-list">
					{#each inbox as task (task.id)}<li
							class="inbox-card"
							draggable="true"
							ondragstart={(event) => dragStart(event, task.id)}
						>
							<span class="inbox-title">{task.title}</span>
							<div class="inbox-actions">
								<Button
									size="sm"
									variant="ghost"
									onclick={() => void model.setTaskDay(task.id, today)}>Today</Button
								><Button
									size="sm"
									variant="ghost"
									onclick={() => void model.setTaskDay(task.id, tomorrow)}>Tomorrow</Button
								>
							</div>
						</li>{/each}
				</ul>{:else}<p class="none">Nothing waiting — capture new work above.</p>{/if}
		</aside>
		<main class="plan-area">
			<section class="today-panel" aria-labelledby="today-heading">
				<h2 id="today-heading"><SunIcon /> Today</h2>
				<div
					class="day-drop"
					role="group"
					aria-label="Today drop column"
					ondragover={(event) => event.preventDefault()}
					ondrop={(event) => {
						event.preventDefault();
						void scheduleOn(today);
					}}
				>
					{#if overdue.length}<p class="overdue-note" role="status">
							{overdue.length} overdue — postponed ones show here.
						</p>{/if}
					{#each todayTasks as task (task.id)}<button
							class="task-chip"
							type="button"
							draggable="true"
							ondragstart={(event) => dragStart(event, task.id)}
							onclick={() => model.openTaskDetails(task.id)}>{task.title}</button
						>{:else}<p class="none">Nothing scheduled for today.</p>{/each}
				</div>
			</section>
			<section class="week-panel" aria-labelledby="week-heading">
				<div class="week-heading-row">
					<h2 id="week-heading"><CalendarClockIcon /> This week</h2>
					<small>{nextWeekCount} next week</small>
				</div>
				<div class="week-days">
					{#each week as day (day.date)}<div
							class="week-day-card"
							class:is-today={day.date === today}
							role="group"
							aria-label={`${day.date} schedule column`}
							ondragover={(event) => event.preventDefault()}
							ondrop={(event) => {
								event.preventDefault();
								void scheduleOn(day.date);
							}}
						>
							<div class="day-head">
								<span>{fmtDay(day.date)}</span>
								<Button
									variant="ghost"
									size="icon"
									class="day-add"
									aria-label={`Add task on ${day.date}`}
									onclick={() => model.openTaskCapture({ dueDay: day.date })}><PlusIcon /></Button
								>
							</div>
							{#each day.tasks as task (task.id)}<button
									class="task-chip"
									type="button"
									draggable="true"
									ondragstart={(event) => dragStart(event, task.id)}
									onclick={() => model.openTaskDetails(task.id)}>{task.title}</button
								>{:else}<p class="none">—</p>{/each}
						</div>{/each}
				</div>
			</section>
		</main>
	</div>
</section>

<style>
	.schedule {
		height: 100%;
		overflow: auto;
		padding: 26px 28px;
		background: var(--background);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
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
	.schedule-layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 22px;
		margin-top: 26px;
	}
	.inbox {
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--card);
		align-self: start;
	}
	.inbox h2,
	.today-panel h2,
	.week-panel h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		font-size: 13px;
		font-weight: 640;
	}
	.inbox h2 :global(svg),
	.today-panel h2 :global(svg),
	.week-panel h2 :global(svg) {
		width: 15px;
		color: var(--muted-foreground);
	}
	.inbox-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.inbox-card {
		display: grid;
		gap: 6px;
		padding: 9px;
		border: 1px dashed var(--border);
		border-radius: 9px;
		cursor: grab;
	}
	.inbox-title {
		font-size: 12px;
	}
	.inbox-actions {
		display: flex;
		justify-content: flex-end;
		gap: 2px;
	}
	:global(.inbox-actions button) {
		height: 24px;
		font-size: 11px;
	}
	.none {
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.plan-area {
		display: flex;
		flex-direction: column;
		gap: 22px;
		min-width: 0;
	}
	.today-panel,
	.week-panel {
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--card);
	}
	.day-drop {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 60px;
	}
	.overdue-note {
		padding: 6px 8px;
		margin-bottom: 4px;
		border-radius: 8px;
		background: color-mix(in oklch, var(--destructive) 12%, transparent);
		color: var(--destructive);
		font-size: 11px;
	}
	.task-chip {
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--accent);
		font-size: 12px;
		text-align: left;
		cursor: grab;
	}
	.week-heading-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.week-heading-row small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.week-days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 8px;
	}
	.week-day-card {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-height: 150px;
		padding: 7px;
		border: 1px solid var(--border);
		border-radius: 9px;
	}
	.week-day-card.is-today {
		border-color: var(--primary);
	}
	.day-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.day-head span {
		color: var(--muted-foreground);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
	}
	:global(.day-add) {
		width: 20px;
		height: 20px;
		opacity: 0;
	}
	:global(.week-day-card:hover .day-add) {
		opacity: 1;
	}
	:global(.day-add svg) {
		width: 12px;
	}
	@media (max-width: 1023px) {
		.schedule-layout {
			grid-template-columns: 1fr;
		}
		.week-days {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
