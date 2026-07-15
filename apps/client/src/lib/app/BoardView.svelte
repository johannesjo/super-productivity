<script lang="ts">
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { Task } from '@noura/domain';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	const today = new Date().toISOString().slice(0, 10);
	const columns = $derived([
		{
			id: 'backlog',
			title: 'Backlog',
			tasks: model.allTasks.filter((task) => task.status === 'open' && task.dueDay !== today)
		},
		{
			id: 'today',
			title: 'Today',
			tasks: model.allTasks.filter((task) => task.status === 'open' && task.dueDay === today)
		},
		{
			id: 'done',
			title: 'Completed',
			tasks: model.allTasks.filter((task) => task.status === 'done')
		}
	]);
	const tracked = (task: Task): string => `${Math.round(task.trackedMs / 60_000)}m`;
</script>

<section class="board" aria-labelledby="board-title">
	<header>
		<div>
			<h1 id="board-title">Boards</h1>
			<p>Move through work by state while keeping the same task details.</p>
		</div>
		<Button size="sm"><PlusIcon data-icon="inline-start" />Add task</Button>
	</header>
	<div class="columns">
		{#each columns as column (column.id)}
			<section class="column">
				<div class="column-title">
					<h2>{column.title} <span>{column.tasks.length}</span></h2>
					<Button variant="ghost" size="icon" aria-label={`Actions for ${column.title}`}
						><MoreHorizontalIcon /></Button
					>
				</div>
				<div class="cards">
					{#each column.tasks as task (task.id)}<Card.Root
							class="task-card"
							onclick={() => model.selectTask(task.id)}
							><Card.Header
								><Card.Title>{task.title}</Card.Title><Card.Description
									>{model.state.projects[task.projectId]?.title}</Card.Description
								></Card.Header
							><Card.Content
								>{#if task.tagIds.length}<div class="tags">
										{#each task.tagIds as tag (tag)}<Badge variant="secondary">{tag}</Badge>{/each}
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
				<Button variant="ghost" size="sm" class="column-add"
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
	.cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	:global(.task-card) {
		cursor: default;
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
