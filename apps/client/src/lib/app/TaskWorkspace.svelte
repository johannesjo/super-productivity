<script lang="ts">
	import type { Task } from '@noura/domain';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ListFilterIcon from '@lucide/svelte/icons/list-filter';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SortAscIcon from '@lucide/svelte/icons/arrow-down-up';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Empty from '$lib/components/ui/empty';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Progress } from '$lib/components/ui/progress';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let quickAdd = $state('');
	let collapsed = $state(false);
	let priorityOnly = $state(false);
	let dueFirst = $state(false);

	const title = $derived(
		model.view === 'today'
			? 'Today'
			: model.view === 'upcoming'
				? 'Upcoming'
				: model.view === 'priority'
					? 'High priority'
					: model.view === 'completed'
						? 'Completed'
						: (model.activeProject?.title ?? 'Inbox')
	);
	const displayTasks = $derived.by(() => {
		const filtered = priorityOnly
			? model.visibleTasks.filter((task) => task.priority >= 2)
			: model.visibleTasks;
		return dueFirst
			? filtered.toSorted((left, right) =>
					(left.dueDay ?? '9999').localeCompare(right.dueDay ?? '9999')
				)
			: filtered;
	});
	const subtitle = $derived(
		model.view === 'today'
			? new Intl.DateTimeFormat(undefined, {
					weekday: 'long',
					month: 'long',
					day: 'numeric'
				}).format(new Date())
			: `${model.visibleTasks.length} open tasks`
	);

	async function submitQuickAdd(event: KeyboardEvent): Promise<void> {
		if (event.key !== 'Enter' || event.isComposing) return;
		await model.addTask(quickAdd);
		quickAdd = '';
	}

	const checklistProgress = (task: Task): number =>
		task.checklist.length
			? Math.round(
					(task.checklist.filter((item) => item.done).length / task.checklist.length) * 100
				)
			: 0;
</script>

<section class="workspace" aria-labelledby="workspace-title">
	<header class="workspace-header">
		<div class="title-row">
			<div>
				<h1 id="workspace-title">{title}</h1>
				<p>{subtitle}</p>
			</div>
			<div class="toolbar" aria-label="Task view tools">
				<Tooltip.Root
					><Tooltip.Trigger
						><Button
							variant={priorityOnly ? 'secondary' : 'ghost'}
							size="icon"
							aria-label="Filter high-priority tasks"
							onclick={() => (priorityOnly = !priorityOnly)}><ListFilterIcon /></Button
						></Tooltip.Trigger
					><Tooltip.Content>Filter tasks</Tooltip.Content></Tooltip.Root
				>
				<Button
					variant={dueFirst ? 'secondary' : 'ghost'}
					size="icon"
					aria-label="Sort tasks by due date"
					onclick={() => (dueFirst = !dueFirst)}><SortAscIcon /></Button
				>
				<Button
					variant={model.completedVisible ? 'secondary' : 'ghost'}
					size="icon"
					aria-label="Toggle completed tasks"
					onclick={() => (model.completedVisible = !model.completedVisible)}
					><MoreHorizontalIcon /></Button
				>
			</div>
		</div>
		<InputGroup.Root class="quick-add">
			<InputGroup.Addon><PlusIcon /></InputGroup.Addon>
			<InputGroup.Input
				bind:value={quickAdd}
				onkeydown={submitQuickAdd}
				aria-label="Add a task"
				placeholder={`Add a task to ${title}. Press Enter to save.`}
			/>
		</InputGroup.Root>
	</header>

	<div class="list-heading">
		<button
			type="button"
			class="group-toggle"
			aria-expanded={!collapsed}
			onclick={() => (collapsed = !collapsed)}
			><ChevronDownIcon class={collapsed ? 'collapsed' : undefined} /> Open
			<span>{displayTasks.length}</span></button
		>
		{#if model.view === 'today'}<Button
				variant="link"
				size="sm"
				onclick={() => model.postponeOverdue()}>Postpone overdue</Button
			>{/if}
	</div>

	{#if displayTasks.length && !collapsed}
		<div class="task-list">
			{#each displayTasks as task (task.id)}
				<button
					class:active={model.state.selectedTaskId === task.id}
					class="task-row"
					type="button"
					onclick={() => model.selectTask(task.id)}
				>
					<span onclick={(event) => event.stopPropagation()} role="presentation"
						><Checkbox
							checked={task.status === 'done'}
							aria-label={`Complete ${task.title}`}
							onclick={() => model.toggleTask(task.id)}
						/></span
					>
					<span class="task-copy">
						<span class:completed={task.status === 'done'} class="task-title">{task.title}</span>
						{#if task.notes || task.checklist.length}<span class="task-meta"
								>{task.checklist.length
									? `${task.checklist.filter((item) => item.done).length}/${task.checklist.length} checklist`
									: 'Notes'}</span
							>{/if}
					</span>
					{#if task.checklist.length}<Progress
							value={checklistProgress(task)}
							class="task-progress"
						/>{/if}
					<span class="task-project">{model.state.projects[task.projectId]?.title}</span>
					{#if task.dueDay}<span
							class="task-date"
							class:overdue={task.dueDay < new Date().toISOString().slice(0, 10)}
							><CalendarClockIcon /> {task.dueDay}</span
						>{/if}
				</button>
			{/each}
		</div>
	{:else}
		<Empty.Root class="empty-state">
			<Empty.Header>
				<Empty.Media variant="icon"><CheckCircle2Icon /></Empty.Media>
				<Empty.Title>No open tasks</Empty.Title>
				<Empty.Description
					>Use the input above to capture the next thing worth doing.</Empty.Description
				>
			</Empty.Header>
		</Empty.Root>
	{/if}
</section>

<style>
	.workspace {
		min-width: 0;
		height: 100%;
		overflow: auto;
		background: var(--background);
	}
	.workspace-header {
		position: sticky;
		top: 0;
		background: color-mix(in oklch, var(--background) 94%, transparent);
		backdrop-filter: blur(18px);
		padding: 26px 28px 12px;
		z-index: 5;
	}
	.title-row,
	.toolbar,
	.list-heading,
	.task-row {
		display: flex;
		align-items: center;
	}
	.title-row {
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}
	h1 {
		font-size: 20px;
		line-height: 1.2;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	.title-row p {
		color: var(--muted-foreground);
		font-size: 12px;
		margin-top: 4px;
	}
	.toolbar {
		gap: 2px;
	}
	:global(.quick-add) {
		height: 44px;
		border-radius: 10px;
		background: var(--muted);
	}
	.list-heading {
		justify-content: space-between;
		padding: 14px 28px 7px;
	}
	.group-toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		font-weight: 620;
		font-size: 13px;
	}
	.group-toggle :global(svg) {
		width: 14px;
	}
	.group-toggle :global(svg.collapsed) {
		transform: rotate(-90deg);
	}
	.group-toggle span {
		color: var(--muted-foreground);
		font-weight: 450;
	}
	.task-list {
		padding: 0 20px 40px;
	}
	.task-row {
		content-visibility: auto;
		contain-intrinsic-size: 48px;
		width: 100%;
		min-height: 48px;
		gap: 12px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		text-align: left;
		border-radius: 10px;
		transition: background-color 160ms ease;
	}
	.task-row:hover,
	.task-row.active {
		background: var(--accent);
	}
	.task-copy {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 3px;
	}
	.task-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 520;
	}
	.task-title.completed {
		color: var(--muted-foreground);
		text-decoration: line-through;
	}
	.task-meta,
	.task-project,
	.task-date {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.task-project {
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.task-date {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.task-date :global(svg) {
		width: 13px;
	}
	.task-date.overdue {
		color: var(--destructive);
	}
	:global(.task-progress) {
		width: 54px;
	}
	:global(.empty-state) {
		min-height: 55vh;
	}
	@media (max-width: 639px) {
		.workspace-header {
			padding: 18px 16px 10px;
		}
		.list-heading {
			padding-inline: 16px;
		}
		.task-list {
			padding-inline: 8px;
		}
		.task-project {
			display: none;
		}
	}
</style>
