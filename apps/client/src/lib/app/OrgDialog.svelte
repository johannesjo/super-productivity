<script lang="ts">
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let tab = $state('projects');
	const colors = ['blue', 'green', 'red', 'amber', 'violet', 'slate'] as const;

	async function addProject(): Promise<void> {
		const title = window.prompt('Project name');
		if (title) await model.addProject(title);
	}
	async function addTag(): Promise<void> {
		const title = window.prompt('Tag name');
		if (title) await model.addTag(title);
	}
</script>

<Dialog.Root bind:open={model.orgOpen}>
	<Dialog.Content class="org-dialog">
		<Dialog.Header>
			<Dialog.Title>Projects & tags</Dialog.Title>
			<Dialog.Description>Rename, recolor, archive, or delete your organization.</Dialog.Description
			>
		</Dialog.Header>
		<Tabs.Root value={tab} onValueChange={(value) => (tab = value as string)}>
			<Tabs.List>
				<Tabs.Trigger value="projects">Projects</Tabs.Trigger>
				<Tabs.Trigger value="tags">Tags</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="projects">
				<div class="org-list">
					{#each model.projects as project (project.id)}<div class="org-row">
							<FolderIcon />
							<input
								class="org-input"
								value={project.title}
								aria-label={`Rename project ${project.title}`}
								onchange={(event) =>
									void model.renameProject(project.id, event.currentTarget.value)}
							/>
							<div class="swatches" aria-label={`Color for ${project.title}`}>
								{#each colors as color (color)}<button
										class="swatch backdrop-color={color}"
										class:selected={project.color === color}
										aria-label={`Set ${project.title} to ${color}`}
										onclick={() => void model.setProjectColor(project.id, color)}
									></button>{/each}
							</div>
							<Button
								variant="ghost"
								size="icon"
								aria-label={project.archived
									? `Unarchive ${project.title}`
									: `Archive ${project.title}`}
								onclick={() => void model.archiveProject(project.id, !project.archived)}
								><ArchiveIcon /></Button
							>
							<Button
								variant="ghost"
								size="icon"
								class="danger"
								aria-label={`Delete project ${project.title}`}
								onclick={() => {
									if (window.confirm(`Delete project "${project.title}"? Its tasks move to Inbox.`))
										void model.removeProject(project.id);
								}}><TrashIcon /></Button
							>
						</div>{:else}<p class="empty">No projects yet.</p>{/each}
					<Button variant="outline" size="sm" onclick={() => void addProject()}
						><PlusIcon /> New project</Button
					>
				</div>
			</Tabs.Content>
			<Tabs.Content value="tags">
				<div class="org-list">
					{#each model.tags as tag (tag.id)}<div class="org-row">
							<TagIcon />
							<input
								class="org-input"
								value={tag.title}
								aria-label={`Rename tag ${tag.title}`}
								onchange={(event) => void model.renameTag(tag.id, event.currentTarget.value)}
							/>
							<div class="swatches" aria-label={`Color for ${tag.title}`}>
								{#each colors as color (color)}<button
										class="swatch backdrop-color={color}"
										class:selected={tag.color === color}
										aria-label={`Set ${tag.title} to ${color}`}
										onclick={() => void model.setTagColor(tag.id, color)}
									></button>{/each}
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="danger"
								aria-label={`Delete tag ${tag.title}`}
								onclick={() => void model.removeTag(tag.id)}><TrashIcon /></Button
							>
						</div>{:else}<p class="empty">No tags yet.</p>{/each}
					<Button variant="outline" size="sm" onclick={() => void addTag()}
						><PlusIcon /> New tag</Button
					>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.org-dialog) {
		width: min(640px, calc(100vw - 32px));
	}
	.org-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 50vh;
		overflow: auto;
	}
	.org-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px;
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.org-row :global(svg) {
		width: 16px;
		color: var(--muted-foreground);
		flex: 0 0 auto;
	}
	.org-input {
		min-width: 0;
		flex: 1;
		padding: 6px 8px;
		border-radius: 6px;
		background: transparent;
		font-size: 13px;
	}
	.org-input:focus {
		box-shadow: 0 0 0 1px var(--ring) inset;
	}
	.swatches {
		display: flex;
		gap: 4px;
	}
	.swatch {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid transparent;
	}
	.swatch.selected {
		border-color: var(--foreground);
	}
	.backdrop-color-blue {
		background: #3b82f6;
	}
	.backdrop-color-green {
		background: #22c55e;
	}
	.backdrop-color-red {
		background: #ef4444;
	}
	.backdrop-color-amber {
		background: #f59e0b;
	}
	.backdrop-color-violet {
		background: #8b5cf6;
	}
	.backdrop-color-slate {
		background: #94a3b8;
	}
	.danger {
		color: var(--destructive);
	}
	.empty {
		color: var(--muted-foreground);
		font-size: 12px;
		padding: 10px 0;
	}
</style>
