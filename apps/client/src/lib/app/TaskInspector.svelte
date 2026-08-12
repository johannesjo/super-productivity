<script lang="ts">
	import { expandRepeatConfig, type ISODate, type TaskRepeatCfg } from '@noura/domain';
	import { renderMarkdown } from '@noura/application';
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RepeatIcon from '@lucide/svelte/icons/repeat-2';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Toggle } from '$lib/components/ui/toggle';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let task = $derived(model.selectedTask);
	let checklistDraft = $state('');
	let notesMode = $state<'edit' | 'preview'>('edit');
	let isTrackingThisTask = $derived(Boolean(task) && model.trackingTaskId() === task?.id);

	// Repeat editor state, seeded once per task from its repeatCfg.
	let repeatedForTaskId: string | undefined;
	let repeatEvery = $state(1);
	let repeatUnit = $state<TaskRepeatCfg['repeatEveryUnit']>('WEEKLY');
	let repeatDays = $state<number[]>([]);

	const repeatCfg = $derived(
		task?.repeatCfgId ? model.state.taskRepeatCfgs[task.repeatCfgId] : undefined
	);

	const repeatPreview = $derived.by(() => {
		const cfg: TaskRepeatCfg = {
			id: 'preview',
			title: 'Preview',
			repeatEvery: Math.max(1, repeatEvery),
			repeatEveryUnit: repeatUnit,
			daysOfWeek: [...repeatDays],
			dayOfMonth: repeatUnit === 'MONTHLY' ? 1 : undefined,
			repeatOffset: 0,
			createdAt: 0,
			modifiedAt: 0
		};
		const today = new Date().toISOString().slice(0, 10) as ISODate;
		const start = cfg.repeatEveryUnit === 'YEARLY' ? `2026-01-01` : today;
		return expandRepeatConfig(cfg, start, `2030-12-31`).dates.slice(0, 5);
	});

	$effect(() => {
		const current = task;
		if (!current) return;
		if (repeatedForTaskId === current.id) return;
		repeatedForTaskId = current.id;
		const cfg = current.repeatCfgId ? model.state.taskRepeatCfgs[current.repeatCfgId] : undefined;
		if (cfg) {
			repeatEvery = cfg.repeatEvery;
			repeatUnit = cfg.repeatEveryUnit;
			repeatDays = [...cfg.daysOfWeek];
		} else {
			repeatEvery = 1;
			repeatUnit = 'WEEKLY';
			repeatDays = [];
		}
	});

	const weekdays = [
		{ value: 0, label: 'S' },
		{ value: 1, label: 'M' },
		{ value: 2, label: 'T' },
		{ value: 3, label: 'W' },
		{ value: 4, label: 'T' },
		{ value: 5, label: 'F' },
		{ value: 6, label: 'S' }
	];

	const toLocalInput = (iso?: string): string =>
		iso
			? (() => {
					const date = new Date(iso);
					const pad = (value: number) => String(value).padStart(2, '0');
					return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
				})()
			: '';
	const fromLocalInput = (value: string): string | undefined =>
		value ? new Date(value).toISOString() : undefined;

	const formatMs = (ms: number): string => {
		const minutes = Math.floor(ms / 60_000);
		return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
	};

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
					size: file.size,
					url: URL.createObjectURL(file)
				}
			]
		});
	}

	async function removeAttachment(attachmentId: string): Promise<void> {
		if (!task) return;
		await model.updateTask(task.id, {
			attachments: task.attachments.filter((attachment) => attachment.id !== attachmentId)
		});
	}

	async function toggleTag(tagId: string): Promise<void> {
		if (!task) return;
		const tagIds = task.tagIds.includes(tagId)
			? task.tagIds.filter((current) => current !== tagId)
			: [...task.tagIds, tagId];
		await model.updateTask(task.id, { tagIds });
	}

	async function createTagAndAdd(): Promise<void> {
		if (!task) return;
		const title = window.prompt('Tag name');
		const id = title?.trim() ? await model.addTag(title.trim()) : undefined;
		if (id && !task.tagIds.includes(id)) await toggleTag(id);
	}

	async function commitRepeat(): Promise<void> {
		if (!task) return;
		await model.applyRepeat(task.id, {
			repeatEvery: Math.max(1, repeatEvery),
			repeatEveryUnit: repeatUnit,
			daysOfWeek: repeatDays,
			dayOfMonth: repeatUnit === 'MONTHLY' ? 1 : undefined
		});
	}

	async function clearRepeat(): Promise<void> {
		if (!task) return;
		await model.clearRepeat(task.id);
	}

	function openIssue(): void {
		if (!task?.issue?.url) return;
		window.open(task.issue.url, '_blank', 'noopener,noreferrer');
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
							dueDay: event.currentTarget.value ? (event.currentTarget.value as ISODate) : undefined
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
					<div class="notes-tools">
						<Field.FieldLabel for="task-notes">Notes</Field.FieldLabel>
						<div class="notes-toggle">
							<button
								type="button"
								class:active={notesMode === 'edit'}
								onclick={() => (notesMode = 'edit')}>Edit</button
							>
							<button
								type="button"
								class:active={notesMode === 'preview'}
								onclick={() => (notesMode = 'preview')}>Preview</button
							>
						</div>
					</div>
					{#if notesMode === 'edit'}
						<Textarea
							id="task-notes"
							value={task.notes}
							oninput={(event) => model.updateTask(task!.id, { notes: event.currentTarget.value })}
							placeholder="Write notes or paste Markdown…"
							rows={9}
						/>
					{:else}
						{#if task.notes.trim()}
							<!-- renderMarkdown escapes raw HTML before applying a fixed whitelist (packages/application/src/md.ts) -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="markdown">{@html renderMarkdown(task.notes)}</div>
						{:else}<p class="notes-empty">Nothing written yet — switch to Edit to compose.</p>{/if}
					{/if}
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
					<TimerIcon /><span>Tracked</span>
					<div class="tracking-row">
						<span class="tracked-time">{formatMs(task.trackedMs)}</span>
						<Button
							size="sm"
							variant={isTrackingThisTask ? 'secondary' : 'outline'}
							aria-label={isTrackingThisTask
								? `Stop tracking ${task.title}`
								: `Track ${task.title}`}
							onclick={() =>
								isTrackingThisTask ? model.stopTracking() : model.startTrackingForTask(task!.id)}
							>{isTrackingThisTask ? 'Stop' : 'Track'}</Button
						>
					</div>
				</div>
				<div>
					<RepeatIcon /><span>Repeat</span>
					<div class="repeat-editor">
						<Input
							class="compact-input repeat-interval"
							type="number"
							min="1"
							value={repeatEvery}
							aria-label="Repeat interval"
							oninput={(event) =>
								(repeatEvery = Math.max(1, Number(event.currentTarget.value) || 1))}
						/><Select.Root
							type="single"
							value={repeatUnit}
							onValueChange={(value) => (repeatUnit = value as TaskRepeatCfg['repeatEveryUnit'])}
							><Select.Trigger size="sm"
								>{repeatUnit === 'WEEKLY'
									? 'week'
									: repeatUnit === 'MONTHLY'
										? 'month'
										: repeatUnit === 'YEARLY'
											? 'year'
											: 'day'}</Select.Trigger
							><Select.Content
								><Select.Group
									><Select.Item value="DAILY">day</Select.Item><Select.Item value="WEEKLY"
										>week</Select.Item
									><Select.Item value="MONTHLY">month</Select.Item><Select.Item value="YEARLY"
										>year</Select.Item
									></Select.Group
								></Select.Content
							></Select.Root
						>
						{#if repeatUnit === 'WEEKLY'}<div class="weekday-row">
								{#each weekdays as day (day.value)}<Toggle
										pressed={repeatDays.includes(day.value)}
										size="sm"
										aria-label={`Repeat on ${day.label}`}
										onPressedChange={(pressed) =>
											(repeatDays = pressed
												? [...repeatDays, day.value].sort((a, b) => a - b)
												: repeatDays.filter((value) => value !== day.value))}>{day.label}</Toggle
									>{/each}
							</div>{/if}
						<div class="repeat-actions">
							<Button size="sm" variant="secondary" onclick={() => void commitRepeat()}
								>Apply</Button
							>
							{#if repeatCfg}<Button size="sm" variant="ghost" onclick={() => void clearRepeat()}
									>Clear</Button
								>{/if}
						</div>
						{#if repeatDays.length || repeatUnit !== 'WEEKLY'}<div class="repeat-preview">
								<small>Next</small>
								<span>{repeatPreview.join(' · ') || '—'}</span>
							</div>{/if}
					</div>
				</div>
				<div>
					<CalendarIcon /><span>Reminder</span><Input
						class="compact-input"
						type="datetime-local"
						value={toLocalInput(task.reminderAt)}
						aria-label="Reminder"
						onchange={(event) =>
							model.updateTask(task!.id, { reminderAt: fromLocalInput(event.currentTarget.value) })}
					/>
				</div>
				<div>
					<TagIcon /><span>Tags</span>
					<div class="tag-picker">
						{#each model.tags as tag (tag.id)}
							<Badge
								variant={task.tagIds.includes(tag.id) ? 'default' : 'outline'}
								class="tag-chip"
								role="button"
								tabindex={0}
								onclick={() => void toggleTag(tag.id)}
								onkeydown={(event) => {
									if (event.key === 'Enter') void toggleTag(tag.id);
								}}>{tag.title}</Badge
							>
						{/each}
						<button
							type="button"
							class="tag-add"
							aria-label="Add tag"
							onclick={() => void createTagAndAdd()}><PlusIcon /></button
						>
					</div>
				</div>
				<div>
					<PaperclipIcon /><span>Files</span><label class="file-action"
						><input type="file" onchange={addAttachment} /><span>Add file</span></label
					>
				</div>
			</div>
			{#if task.attachments.length}<div class="attachments">
					{#each task.attachments as attachment (attachment.id)}<Badge
							variant="outline"
							class="attachment-badge"
							><button
								type="button"
								class="open-attachment"
								onclick={() => attachment.url && window.open(attachment.url, '_blank')}
								>{attachment.name}</button
							><button
								type="button"
								class="remove-attachment"
								aria-label={`Remove attachment ${attachment.name}`}
								onclick={() => void removeAttachment(attachment.id)}><XIcon /></button
							></Badge
						>{/each}
				</div>{/if}
			{#if task.issue}<div class="issue-panel">
					<div class="issue-heading"><LinkIcon /><span>Linked issue</span></div>
					<button type="button" class="issue-link" onclick={openIssue}
						><strong>{task.issue.key}</strong><span>{task.issue.providerId}</span></button
					>
					<p class="issue-note">
						Comments and status sync arrive with the provider adapter (Phase 7).
					</p>
				</div>{/if}
		</div>
		<footer>
			<span><InboxIcon /> {model.state.projects[task.projectId]?.title}</span>
			<div>
				{#if task.checklist.length}<span title="Checklist"
						><ListChecksIcon />
						{task.checklist.filter((item) => item.done).length}/{task.checklist.length}</span
					>{/if}
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
	.notes-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.notes-toggle {
		display: inline-flex;
		gap: 2px;
	}
	.notes-toggle button {
		padding: 2px 8px;
		border-radius: 6px;
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.notes-toggle button.active {
		background: var(--accent);
		color: var(--foreground);
	}
	.markdown {
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		font-size: 13px;
		line-height: 1.6;
	}
	.markdown :global(p) {
		margin: 0 0 8px;
	}
	.markdown :global(ul),
	.markdown :global(ol) {
		padding-left: 20px;
		margin: 0 0 8px;
	}
	.markdown :global(pre) {
		padding: 8px;
		overflow: auto;
		border-radius: 8px;
		background: var(--muted);
		font-size: 12px;
	}
	.markdown :global(code) {
		font-size: 0.92em;
	}
	.notes-empty {
		color: var(--muted-foreground);
		font-size: 12px;
		padding: 10px 0;
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
	.tracking-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.tracked-time {
		font-variant-numeric: tabular-nums;
	}
	:global(.repeat-interval) {
		width: 52px;
	}
	.repeat-editor {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}
	.weekday-row {
		display: inline-flex;
		gap: 3px;
	}
	.repeat-actions {
		display: inline-flex;
		gap: 4px;
	}
	.repeat-preview {
		display: flex;
		align-items: center;
		flex-basis: 100%;
		gap: 6px;
		color: var(--muted-foreground);
		font-size: 11px;
		white-space: nowrap;
		overflow: hidden;
	}
	.tag-picker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 5px;
	}
	:global(.tag-chip) {
		cursor: pointer;
	}
	:global(.tag-chip[role='button']):focus-visible {
		outline: 2px solid var(--ring);
	}
	.tag-add {
		display: grid;
		width: 22px;
		height: 22px;
		place-content: center;
		border: 1px dashed var(--border);
		border-radius: 6px;
		color: var(--muted-foreground);
	}
	.tag-add :global(svg) {
		width: 12px;
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
	:global(.attachment-badge) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.open-attachment,
	.remove-attachment {
		background: transparent;
	}
	.open-attachment {
		color: var(--foreground);
	}
	.remove-attachment {
		display: grid;
		place-content: center;
		color: var(--muted-foreground);
	}
	.remove-attachment :global(svg) {
		width: 11px;
	}
	.issue-panel {
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.issue-heading {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 8px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.issue-heading :global(svg) {
		width: 14px;
	}
	.issue-link {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.issue-link strong {
		color: var(--primary);
	}
	.issue-note {
		margin-top: 8px;
		color: var(--muted-foreground);
		font-size: 11px;
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
