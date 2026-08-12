<script lang="ts">
	import { createTranslator } from '@noura/application';
	import type { Task } from '@noura/domain';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import CheckSquareIcon from '@lucide/svelte/icons/square-check-big';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CornerDownRightIcon from '@lucide/svelte/icons/corner-down-right';
	import CornerUpLeftIcon from '@lucide/svelte/icons/corner-up-left';
	import ListFilterIcon from '@lucide/svelte/icons/list-filter';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SortAscIcon from '@lucide/svelte/icons/arrow-down-up';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let quickAdd = $state('');
	let collapsed = $state(false);
	let priorityOnly = $state(false);
	let dueFirst = $state(false);
	let editingId = $state<string | undefined>();
	let editDraft = $state('');
	let dragId = $state<string | undefined>();
	let subtaskDraftFor = $state<string | undefined>();
	let subtaskDraft = $state('');

	const t = $derived(createTranslator(model.config.language));
	const title = $derived(
		model.view === 'today'
			? t('nav.today')
			: model.view === 'upcoming'
				? t('nav.upcoming')
				: model.view === 'priority'
					? t('nav.highPriority')
					: model.view === 'completed'
						? t('nav.completed')
						: model.view === 'smartlist'
							? (model.activeSmartList?.title ?? t('nav.smartLists'))
							: model.view === 'tag'
								? model.activeTag
									? `Task: ${model.activeTag.title}`
									: t('nav.tags')
								: model.view === 'archives'
									? t('nav.archives')
									: (model.activeProject?.title ?? t('nav.inbox'))
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

	// Render the task list as a nested tree: children are indented under their
	// parent regardless of flat taskOrder, depth derived from subtaskIds, and a
	// task's named sections render as heading rows before their children.
	const treeRows = $derived.by(() => {
		type Row =
			| { type: 'task'; task: Task; depth: number }
			| { type: 'section'; title: string; depth: number };
		const rows: Row[] = [];
		const byId = Object.fromEntries(
			displayTasks.map((task) => [task.id, task]) as Array<[string, Task]>
		);
		// Plain record sets keep the derivation deterministic (scratch state, not
		// reactive Svelte state) and lint-friendly.
		const visited: Record<string, true> = {};
		const visit = (id: string, depth: number): void => {
			const task = byId[id];
			if (!task || visited[id]) return;
			visited[id] = true;
			rows.push({ type: 'task', task, depth });
			const sectionOf: Record<string, string> = {};
			const children: string[] = [];
			for (const childId of task.subtaskIds) {
				const child = byId[childId];
				if (!child || visited[childId] || child.parentId !== task.id) continue;
				sectionOf[childId] =
					task.sections.find((section) => section.taskIds.includes(child.id))?.title ?? '';
				children.push(childId);
			}
			const sectionLabels = children
				.map((childId) => sectionOf[childId] ?? '')
				.filter((label, index, all) => Boolean(label) && all.indexOf(label) === index);
			for (const childId of children) {
				if (!(sectionOf[childId] ?? '')) visit(childId, depth + 1);
			}
			for (const label of sectionLabels) {
				rows.push({ type: 'section', title: label, depth: depth + 1 });
				for (const childId of children) {
					if (sectionOf[childId] === label) visit(childId, depth + 1);
				}
			}
		};
		for (const task of displayTasks) {
			if (task.parentId && byId[task.parentId]) continue;
			visit(task.id, 0);
		}
		return rows;
	});

	const subtitle = $derived(
		model.view === 'today'
			? new Intl.DateTimeFormat(undefined, {
					weekday: 'long',
					month: 'long',
					day: 'numeric'
				}).format(new Date())
			: t('workspace.openTasks', { count: model.visibleTasks.length })
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

	function beginEdit(task: Task): void {
		editingId = task.id;
		editDraft = task.title;
	}

	async function commitEdit(): Promise<void> {
		const id = editingId;
		editingId = undefined;
		if (id) await model.renameTask(id, editDraft);
	}

	function beginSubtask(parent: Task): void {
		subtaskDraftFor = parent.id;
		subtaskDraft = '';
	}

	async function commitSubtask(): Promise<void> {
		const parentId = subtaskDraftFor;
		subtaskDraftFor = undefined;
		if (parentId && subtaskDraft.trim()) await model.addSubtask(parentId, subtaskDraft);
	}

	// HTML5 drag-and-drop reorder: moving a row rebuilds the flat taskOrder; the
	// tree renderer keeps children attached to their parent afterwards.
	function dragStart(event: DragEvent, id: string): void {
		dragId = id;
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function dropTo(targetId: string): void {
		const dragged = dragId;
		dragId = undefined;
		if (!dragged || dragged === targetId) return;
		const ids = treeRows.filter((row) => row.type === 'task').map((row) => row.task.id);
		const from = ids.indexOf(dragged);
		const to = ids.indexOf(targetId);
		if (from < 0 || to < 0) return;
		ids.splice(from, 1);
		ids.splice(to, 0, dragged);
		void model.reorderTasks(ids);
	}
</script>

<section class="workspace" role="main" aria-labelledby="workspace-title">
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
			<span>{treeRows.length}</span></button
		>
		{#if model.view === 'today'}<Button
				variant="link"
				size="sm"
				onclick={() => model.postponeOverdue()}>Postpone overdue</Button
			>{/if}
	</div>

	{#if treeRows.length && !collapsed}
		<div class="task-list">
			{#each treeRows as row (row.type === 'task' ? row.task.id : `section-${row.title}`)}
				{#if row.type === 'section'}
					<div class="section-row" style={`--task-depth: ${row.depth}`}>
						<h3>{row.title}</h3>
					</div>
				{:else}
					{@const task = row.task}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<button
								class:active={model.state.selectedTaskId === task.id}
								class="task-row"
								class:done={task.status === 'done'}
								style={`--task-depth: ${row.depth}`}
								type="button"
								draggable="true"
								ondragstart={(event) => dragStart(event, task.id)}
								ondragover={(event) => event.preventDefault()}
								ondrop={(event) => {
									event.preventDefault();
									dropTo(task.id);
								}}
								onclick={() => model.selectTask(task.id)}
								ondblclick={() => beginEdit(task)}
							>
								<span class="indent" aria-hidden="true"></span>
								<span onclick={(event) => event.stopPropagation()} role="presentation"
									><Checkbox
										checked={task.status === 'done'}
										aria-label={`Complete ${task.title}`}
										onclick={() => model.toggleTask(task.id)}
									/></span
								>
								<span class="task-copy">
									{#if editingId === task.id}
										<Input
											class="inline-edit"
											bind:value={editDraft}
											aria-label={`Edit ${task.title}`}
											onclick={(event) => event.stopPropagation()}
											onkeydown={(event) => {
												if (event.key === 'Enter') void commitEdit();
												else if (event.key === 'Escape') editingId = undefined;
											}}
											onblur={() => void commitEdit()}
										/>
									{:else}
										<span class:completed={task.status === 'done'} class="task-title"
											>{task.title}</span
										>
										{#if task.notes || task.checklist.length}<span class="task-meta"
												>{task.checklist.length
													? `${task.checklist.filter((item) => item.done).length}/${task.checklist.length} checklist`
													: 'Notes'}</span
											>{/if}
									{/if}
									{#if subtaskDraftFor === task.id}
										<Input
											class="subtask-edit"
											bind:value={subtaskDraft}
											placeholder="Sub-task title…"
											aria-label={`Add sub-task to ${task.title}`}
											onclick={(event) => event.stopPropagation()}
											onkeydown={(event) => {
												if (event.key === 'Enter') void commitSubtask();
												else if (event.key === 'Escape') subtaskDraftFor = undefined;
											}}
										/>
									{/if}
								</span>
								{#if task.checklist.length}<Progress
										value={checklistProgress(task)}
										class="task-progress"
										aria-label={`${checklistProgress(task)}% checklist complete for ${task.title}`}
									/>{/if}
								<span class="task-project">{model.state.projects[task.projectId]?.title}</span>
								{#if task.dueDay}<span
										class="task-date"
										class:overdue={task.dueDay < new Date().toISOString().slice(0, 10)}
										><CalendarClockIcon /> {task.dueDay}</span
									>{/if}
							</button>
						</ContextMenu.Trigger>
						<ContextMenu.Content class="task-context-menu" side="bottom" align="start">
							<ContextMenu.Item onclick={() => model.toggleTask(task.id)}>
								<CheckSquareIcon />
								{task.status === 'done' ? 'Reopen' : 'Complete'}
							</ContextMenu.Item>
							<ContextMenu.Item onclick={() => beginEdit(task)}>
								<PencilIcon />
								Edit title
							</ContextMenu.Item>
							<ContextMenu.Item onclick={() => beginSubtask(task)}>
								<CornerDownRightIcon />
								Add sub-task
							</ContextMenu.Item>
							{#if task.parentId}
								<ContextMenu.Item onclick={() => model.dedentTask(task.id)}>
									<CornerUpLeftIcon />
									Dedent
								</ContextMenu.Item>
							{/if}
							<ContextMenu.Separator />
							<ContextMenu.Item onclick={() => model.removeTask(task.id)} class="danger"
								><Trash2Icon />Delete</ContextMenu.Item
							>
						</ContextMenu.Content>
					</ContextMenu.Root>
				{/if}
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
	.section-row {
		display: flex;
		align-items: center;
		height: 34px;
		margin-top: 6px;
		padding: 0 12px 0 calc(12px + var(--task-depth) * 22px);
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
	.task-row.done .task-title {
		color: var(--muted-foreground);
		text-decoration: line-through;
	}
	.indent {
		width: calc(var(--task-depth) * 22px);
		flex: 0 0 auto;
	}
	:global(.task-row [data-slot='checkbox']) {
		width: 24px;
		height: 24px;
		border-radius: 7px;
	}
	:global(.task-row [data-slot='checkbox']::after) {
		width: 14px;
		height: 14px;
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
	:global(.context-menu-trigger) {
		display: contents;
	}
	:global(.inline-edit) {
		height: 34px;
		font-size: 14px;
	}
	:global(.subtask-edit) {
		height: 30px;
		font-size: 13px;
	}
	:global(.task-context-menu) {
		min-width: 190px;
	}
	:global(.task-context-menu [data-slot='context-menu-item'].danger) {
		color: var(--destructive);
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
