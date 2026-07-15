<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let task = $derived(model.selectedTask);
	let checklistDraft = $state('');

	async function addChecklist(event: KeyboardEvent): Promise<void> {
		if (event.key !== 'Enter' || event.isComposing || !task) return;
		await model.addChecklistItem(task.id, checklistDraft);
		checklistDraft = '';
	}

	async function addAttachment(event: Event): Promise<void> {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file || !task) return;
		await model.updateTask(task.id, {
			attachments: [
				...task.attachments,
				{
					id: crypto.randomUUID(),
					name: file.name,
					mimeType: file.type || 'application/octet-stream',
					size: file.size
				}
			]
		});
	}
</script>

<aside class="inspector" aria-label="Task details">
	{#if task}
		<header class="inspector-bar">
			<Checkbox
				checked={task.status === 'done'}
				aria-label="Complete task"
				onclick={() => model.toggleTask(task!.id)}
			/>
			<label class="date-control"
				><CalendarIcon /><span class="sr-only">Due date</span><input
					type="date"
					value={task.dueDay ?? ''}
					onchange={(event) =>
						model.updateTask(task!.id, {
							dueDay: event.currentTarget.value
								? (event.currentTarget.value as `${number}-${number}-${number}`)
								: undefined
						})}
				/></label
			>
			<span class="spacer"></span>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Delete task"
				onclick={() => model.removeTask(task!.id)}><TrashIcon /></Button
			>
			<Button variant="ghost" size="icon" aria-label="Task actions"><MoreHorizontalIcon /></Button>
		</header>
		<div class="inspector-content">
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel class="sr-only" for="task-title">Task title</Field.FieldLabel>
					<Input
						id="task-title"
						class="title-input"
						value={task.title}
						oninput={(event) => model.updateTask(task!.id, { title: event.currentTarget.value })}
					/>
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="task-notes">Notes</Field.FieldLabel>
					<Textarea
						id="task-notes"
						value={task.notes}
						oninput={(event) => model.updateTask(task!.id, { notes: event.currentTarget.value })}
						placeholder="Write notes or paste Markdown…"
						rows={9}
					/>
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel>Checklist</Field.FieldLabel>
					<div class="checklist">
						{#each task.checklist as item (item.id)}<label
								><Checkbox
									checked={item.done}
									onclick={() => model.toggleChecklistItem(task!.id, item.id)}
								/><span class:done={item.done}>{item.title}</span></label
							>{/each}
						<div class="checklist-add">
							<PlusIcon /><Input
								bind:value={checklistDraft}
								onkeydown={addChecklist}
								placeholder="Add checklist item"
							/>
						</div>
					</div>
				</Field.Field>
			</Field.FieldGroup>
			<Separator />
			<div class="detail-grid">
				<div>
					<InboxIcon /><span>Project</span><Select.Root
						type="single"
						value={task.projectId}
						onValueChange={(value) => value && model.updateTask(task!.id, { projectId: value })}
						><Select.Trigger size="sm">{model.state.projects[task.projectId]?.title}</Select.Trigger
						><Select.Content
							><Select.Group
								>{#each Object.values(model.state.projects) as project (project.id)}<Select.Item
										value={project.id}>{project.title}</Select.Item
									>{/each}</Select.Group
							></Select.Content
						></Select.Root
					>
				</div>
				<div>
					<FlagIcon /><span>Priority</span><Select.Root
						type="single"
						value={String(task.priority)}
						onValueChange={(value) => model.setPriority(task!.id, Number(value) as 0 | 1 | 2 | 3)}
						><Select.Trigger size="sm">P{task.priority || '–'}</Select.Trigger><Select.Content
							><Select.Group
								><Select.Item value="0">None</Select.Item><Select.Item value="1">Low</Select.Item
								><Select.Item value="2">Medium</Select.Item><Select.Item value="3">High</Select.Item
								></Select.Group
							></Select.Content
						></Select.Root
					>
				</div>
				<div>
					<TimerIcon /><span>Estimate</span><Input
						class="compact-input"
						type="number"
						min="0"
						value={Math.round(task.estimateMs / 60_000)}
						aria-label="Estimate in minutes"
						onchange={(event) =>
							model.updateTask(task!.id, {
								estimateMs: Math.max(0, Number(event.currentTarget.value) || 0) * 60_000
							})}
					/>
				</div>
				<div>
					<TagIcon /><span>Tags</span><Input
						class="compact-input"
						value={task.tagIds.join(', ')}
						aria-label="Tags"
						onchange={(event) =>
							model.updateTask(task!.id, {
								tagIds: event.currentTarget.value
									.split(',')
									.map((tag) => tag.trim())
									.filter(Boolean)
							})}
					/>
				</div>
				<div>
					<CalendarIcon /><span>Repeat</span><Input
						class="compact-input"
						value={task.repeatRule ?? ''}
						aria-label="Repeat rule"
						placeholder="e.g. weekly"
						onchange={(event) =>
							model.updateTask(task!.id, { repeatRule: event.currentTarget.value || undefined })}
					/>
				</div>
				<div>
					<CalendarIcon /><span>Reminder</span><Input
						class="compact-input"
						type="datetime-local"
						value={task.reminderAt ?? ''}
						aria-label="Reminder"
						onchange={(event) =>
							model.updateTask(task!.id, { reminderAt: event.currentTarget.value || undefined })}
					/>
				</div>
				<div>
					<PaperclipIcon /><span>Files</span><label class="file-action"
						><input type="file" onchange={addAttachment} /><span>Add file</span></label
					>
				</div>
			</div>
			{#if task.attachments.length}<div class="attachments">
					{#each task.attachments as attachment (attachment.id)}<Badge variant="outline"
							>{attachment.name}</Badge
						>{/each}
				</div>{/if}
		</div>
		<footer>
			<span><InboxIcon /> {model.state.projects[task.projectId]?.title}</span>
			<div>
				<Button variant="ghost" size="sm">Format</Button><Button
					variant="ghost"
					size="icon"
					aria-label="More details"><MoreHorizontalIcon /></Button
				>
			</div>
		</footer>
	{:else}
		<div class="inspector-empty">
			<div class="empty-mark">N</div>
			<h2>Select a task</h2>
			<p>Details, notes, schedule, and linked issues will stay here while you work.</p>
		</div>
	{/if}
</aside>

<style>
	.inspector {
		height: 100%;
		background: var(--background);
	}
	.inspector-bar,
	footer {
		display: flex;
		height: 58px;
		align-items: center;
		gap: 10px;
		padding: 0 20px;
		border-bottom: 1px solid var(--border);
	}
	.spacer {
		flex: 1;
	}
	.inspector-content {
		display: flex;
		height: calc(100% - 116px);
		flex-direction: column;
		gap: 22px;
		overflow: auto;
		padding: 24px;
	}
	:global(.title-input) {
		height: auto;
		border: 0;
		background: transparent;
		padding-inline: 0;
		font-size: 20px;
		font-weight: 650;
		box-shadow: none;
	}
	.detail-grid {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.detail-grid > div {
		display: grid;
		grid-template-columns: 18px 82px 1fr;
		min-height: 38px;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}
	.detail-grid :global(svg) {
		width: 15px;
		color: var(--muted-foreground);
	}
	.detail-grid span {
		color: var(--muted-foreground);
	}
	.date-control {
		display: flex;
		align-items: center;
		gap: 7px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.date-control :global(svg) {
		width: 15px;
	}
	.date-control input {
		color-scheme: dark;
		background: transparent;
	}
	.checklist {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.checklist label,
	.checklist-add {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 12px;
	}
	.checklist .done {
		color: var(--muted-foreground);
		text-decoration: line-through;
	}
	.checklist-add :global(svg) {
		width: 15px;
		color: var(--muted-foreground);
	}
	:global(.compact-input) {
		height: 30px;
		border-color: transparent;
		background: transparent;
		padding-inline: 6px;
		font-size: 12px;
		box-shadow: none;
	}
	.file-action {
		color: var(--primary);
		cursor: pointer;
	}
	.file-action input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		opacity: 0;
	}
	.attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	footer {
		justify-content: space-between;
		border-top: 1px solid var(--border);
		border-bottom: 0;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	footer span,
	footer div {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	footer :global(svg) {
		width: 14px;
	}
	.inspector-empty {
		display: grid;
		height: 100%;
		place-content: center;
		padding: 40px;
		text-align: center;
		color: var(--muted-foreground);
	}
	.empty-mark {
		margin: 0 auto 16px;
		display: grid;
		width: 56px;
		height: 56px;
		place-content: center;
		border: 1px solid var(--border);
		border-radius: 18px;
		color: var(--foreground);
		font-size: 22px;
		font-weight: 700;
	}
	.inspector-empty h2 {
		color: var(--foreground);
		font-size: 16px;
	}
	.inspector-empty p {
		max-width: 280px;
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.55;
	}
</style>
