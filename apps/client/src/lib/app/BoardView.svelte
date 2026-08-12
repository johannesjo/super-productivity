<script lang="ts">
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { Task } from '@noura/domain';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	const today = new Date().toISOString().slice(0, 10) as `${number}-${number}-${number}`;
	let boardProjectId = $state('all');
	let useWorkContext = $state(false);
	let wipLimit = $state(6);

	const activeContext = $derived(
		model.state.activeWorkContextId
			? model.state.workContexts[model.state.activeWorkContextId]
			: undefined
	);

	const scopeTasks = $derived.by(() => {
		let tasks = model.allTasks;
		if (boardProjectId !== 'all') {
			tasks = tasks.filter((task) => task.projectId === boardProjectId);
		}
		if (useWorkContext && activeContext) {
			const inContext = new Set(activeContext.taskIds);
			tasks = tasks.filter((task) => inContext.has(task.id));
		}
		return tasks;
	});

	const columns = $derived.by(() => {
		const open = scopeTasks.filter((task) => task.status === 'open');
		return [
			{
				id: 'open',
				title: 'Open',
				tasks: open,
				overWip: open.length
			},
			{
				id: 'done',
				title: 'Done',
				tasks: scopeTasks.filter((task) => task.status === 'done'),
				overWip: 0
			},
			{
				id: 'archived',
				title: 'Archived',
				tasks: scopeTasks.filter((task) => task.status === 'archived'),
				overWip: 0
			}
		];
	});

	const tracked = (task: Task): string => `${Math.round(task.trackedMs / 60_000)}m`;
	let dragId: string | undefined;

	function addToColumn(columnId: string): void {
		model.openTaskCapture(
			columnId === 'done' ? { status: 'done' } : columnId === 'open' ? { dueDay: today } : {}
		);
	}

	/** Moves a card through the state transitions the domain supports. */
	async function moveToColumn(task: Task, targetColumn: string): Promise<void> {
		if (targetColumn === 'open') {
			if (task.status === 'open') return;
			const openCount = scopeTasks.filter(
				(candidate) => candidate.status === 'open' && candidate.id !== task.id
			).length;
			if (openCount >= wipLimit) return;
			if (task.status === 'done') await model.toggleTask(task.id);
			else await model.restoreTask(task.id);
		} else if (targetColumn === 'done') {
			if (task.status === 'done') return;
			if (task.status === 'archived') await model.restoreTask(task.id);
			if (task.status === 'open') await model.toggleTask(task.id);
		} else {
			// archived
			if (task.status !== 'archived') await model.archiveTask(task.id);
		}
	}

	function dragStart(event: DragEvent, id: string): void {
		dragId = id;
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	async function dropOn(event: DragEvent, targetColumn: string): Promise<void> {
		event.preventDefault();
		const id = dragId;
		dragId = undefined;
		const task = id ? model.state.tasks[id] : undefined;
		if (task) await moveToColumn(task, targetColumn);
	}
</script>

<section class="board" aria-labelledby="board-title">
	<header>
		<div>
			<h1 id="board-title">Boards</h1>
			<p>Move work through Open, Done, and Archive with drag-and-drop.</p>
		</div>
		<div class="board-controls">
			<Select.Root
				type="single"
				value={boardProjectId}
				onValueChange={(value) => (boardProjectId = value)}
				><Select.Trigger size="sm"
					>{boardProjectId === 'all'
						? 'All projects'
						: (model.state.projects[boardProjectId]?.title ?? 'Project')}</Select.Trigger
				><Select.Content
					><Select.Group
						><Select.Item value="all">All projects</Select.Item
						>{#each model.projects as project (project.id)}<Select.Item value={project.id}
								>{project.title}</Select.Item
							>{/each}</Select.Group
					></Select.Content
				></Select.Root
			>
			<Select.Root
				type="single"
				value={String(wipLimit)}
				onValueChange={(value) => (wipLimit = Number(value))}
				><Select.Trigger size="sm">WIP {wipLimit}</Select.Trigger><Select.Content
					><Select.Group
						><Select.Item value="4">WIP 4</Select.Item><Select.Item value="6">WIP 6</Select.Item
						><Select.Item value="10">WIP 10</Select.Item><Select.Item value="20">WIP 20</Select.Item
						></Select.Group
					></Select.Content
				></Select.Root
			>
			{#if activeContext}<Tooltip.Root
					><Tooltip.Trigger
						><Button
							variant={useWorkContext ? 'secondary' : 'ghost'}
							size="sm"
							aria-label="Board from work context"
							onclick={() => (useWorkContext = !useWorkContext)}>{activeContext.title}</Button
						></Tooltip.Trigger
					><Tooltip.Content>Show only this work context's tasks</Tooltip.Content></Tooltip.Root
				>{/if}
			<Button size="sm" onclick={() => addToColumn('open')}
				><PlusIcon data-icon="inline-start" />Add task</Button
			>
		</div>
	</header>
	<div class="columns">
		{#each columns as column (column.id)}
			<section
				class:over-wip={column.id === 'open' && column.overWip > wipLimit}
				class="column"
				role="group"
				aria-label={`${column.title} board column`}
				ondragover={(event) => event.preventDefault()}
				ondrop={(event) => void dropOn(event, column.id)}
			>
				<div class="column-title">
					<h2>{column.title} <span>{column.tasks.length}</span></h2>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="icon" aria-label={`Actions for ${column.title}`}
								><MoreHorizontalIcon /></Button
							>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => addToColumn(column.id)}>Add task</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
				{#if column.id === 'open' && column.overWip > wipLimit}<p class="wip-note" role="status">
						Over WIP limit ({wipLimit}) — move some work to Done first.
					</p>{/if}
				<div class="cards">
					{#each column.tasks as task (task.id)}<Card.Root
							class="task-card"
							draggable="true"
							ondragstart={(event) => dragStart(event, task.id)}
							onclick={() => model.openTaskDetails(task.id)}
							><Card.Header
								><Card.Title>{task.title}</Card.Title><Card.Description
									>{model.state.projects[task.projectId]?.title}</Card.Description
								></Card.Header
							><Card.Content
								>{#if task.tagIds.length}<div class="tags">
										{#each task.tagIds as tagId (tagId)}<Badge variant="secondary"
												>{model.state.tags[tagId]?.title ?? tagId}</Badge
											>{/each}
									</div>{/if}</Card.Content
							><Card.Footer
								><span
									>{task.estimateMs
										? `${Math.round(task.estimateMs / 60_000)}m estimate`
										: 'No estimate'}</span
								><span>{tracked(task)} tracked</span></Card.Footer
							></Card.Root
						>{/each}
				</div>
				<Button variant="ghost" size="sm" class="column-add" onclick={() => addToColumn(column.id)}
					><PlusIcon data-icon="inline-start" />Add task</Button
				>
			</section>
		{/each}
	</div>
</section>

<style>
	.board {
		height: 100%;
		overflow: auto;
		padding: 26px 28px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
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
	.board-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.board-controls :global(svg) {
		width: 14px;
	}
	.columns {
		display: grid;
		min-width: 900px;
		grid-template-columns: repeat(3, 1fr);
		align-items: start;
		gap: 18px;
		margin-top: 30px;
	}
	.column {
		min-height: 620px;
		padding: 10px;
		border-radius: 12px;
		background: var(--muted);
		transition: box-shadow 140ms ease;
	}
	.column:hover {
		box-shadow: 0 0 0 1px var(--border) inset;
	}
	.column.over-wip {
		box-shadow: 0 0 0 1px var(--destructive) inset;
	}
	.column-title {
		display: flex;
		height: 36px;
		align-items: center;
		justify-content: space-between;
		padding-left: 6px;
	}
	.column-title h2 {
		font-size: 12px;
		font-weight: 650;
	}
	.column-title span {
		margin-left: 4px;
		color: var(--muted-foreground);
		font-weight: 450;
	}
	.wip-note {
		padding: 6px 8px;
		margin: 4px 0 8px;
		border-radius: 8px;
		background: color-mix(in oklch, var(--destructive) 12%, transparent);
		color: var(--destructive);
		font-size: 11px;
	}
	.cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	:global(.task-card) {
		cursor: grab;
		border: 0;
		box-shadow: 0 1px 2px color-mix(in oklch, var(--foreground) 8%, transparent);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	:global(.task-card [data-slot='card-footer']) {
		justify-content: space-between;
		color: var(--muted-foreground);
		font-size: 10px;
	}
	:global(.column-add) {
		width: 100%;
		margin-top: 8px;
	}
</style>
