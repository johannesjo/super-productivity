<script lang="ts">
	import { renderMarkdown } from '@noura/application';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let notesMode = $state<'edit' | 'preview'>('edit');

	const note = $derived(model.selectedNote);

	const noteTitle = (content: string): string => {
		const first = content.split('\n').find((line) => line.trim());
		return (first ?? '').replace(/^#+\s*/, '').trim() || 'Untitled';
	};

	async function createNote(): Promise<void> {
		const title = window.prompt('Note title');
		if (title) await model.addNote(title);
	}

	async function addBookmark(): Promise<void> {
		if (!note) return;
		const path = window.prompt('Bookmark path (e.g. folder/file.md)');
		if (path) await model.addBookmark(note.id, path);
	}

	function openBookmark(path: string): void {
		const channel = new BroadcastChannel('noura:bookmark-open');
		channel.postMessage({ path });
		channel.close();
	}
</script>

<section class="notes-view" aria-labelledby="notes-title">
	<header class="notes-header">
		<div>
			<h1 id="notes-title">Notes</h1>
			<p>Local Markdown notes with bookmarks, searchable and offline.</p>
		</div>
		<Button variant="outline" size="sm" onclick={() => void createNote()}
			><PlusIcon /> New note</Button
		>
	</header>
	<div class="notes-layout">
		<aside class="notes-list">
			{#each model.notes as item (item.id)}
				<button
					class:active={model.selectedNoteId === item.id}
					type="button"
					onclick={() => model.selectNote(item.id)}
				>
					<span class="note-name">{noteTitle(item.content)}</span>
					<span class="note-meta"
						>{model.state.projects[item.projectId]?.title ?? ''} · {new Date(
							item.modifiedAt
						).toLocaleDateString()}</span
					>
				</button>
			{:else}<p class="notes-empty">No notes yet — create your first one.</p>{/each}
		</aside>
		{#if note}
			<article class="note-editor">
				<div class="note-tools">
					<span class="note-title">{noteTitle(note.content)}</span>
					<div class="tool-actions">
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
						<Button
							variant="ghost"
							size="icon"
							aria-label="Bookmark"
							onclick={() => void addBookmark()}><BookmarkIcon /></Button
						>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Delete note"
							onclick={() => model.removeNote(note.id)}><TrashIcon /></Button
						>
					</div>
				</div>
				{#if notesMode === 'edit'}
					<Textarea
						class="note-textarea"
						value={note.content}
						oninput={(event) => model.updateNote(note.id, { content: event.currentTarget.value })}
						spellcheck="false"
					/>
				{:else}
					<!-- renderMarkdown escapes raw HTML (packages/application/src/md.ts) -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="markdown">{@html renderMarkdown(note.content)}</div>
				{/if}
				{#if note.bookmarks.length}<div class="bookmarks">
						<h2><BookmarkIcon /> Bookmarks</h2>
						<ul>
							{#each note.bookmarks as bookmark (bookmark.id)}<li>
									<button
										type="button"
										class="bookmark-path"
										onclick={() => openBookmark(bookmark.path)}>{bookmark.path}</button
									><button
										type="button"
										class="bookmark-remove"
										aria-label={`Remove bookmark ${bookmark.path}`}
										onclick={() => model.removeBookmark(note.id, bookmark.id)}>×</button
									>
								</li>{/each}
						</ul>
					</div>{/if}
			</article>
		{:else}<div class="note-placeholder">
				<div class="empty-mark">N</div>
				<h2>Pick a note</h2>
				<p>Notes live per project, render Markdown, and keep bookmarks to other files.</p>
			</div>{/if}
	</div>
</section>

<style>
	.notes-view {
		height: 100%;
		overflow: auto;
		background: var(--background);
	}
	.notes-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 26px 28px 16px;
	}
	h1 {
		font-size: 20px;
		letter-spacing: -0.02em;
	}
	.notes-header p {
		margin-top: 4px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.notes-header :global(svg) {
		width: 15px;
	}
	.notes-layout {
		display: grid;
		grid-template-columns: 240px 1fr;
		height: calc(100% - 92px);
		border-top: 1px solid var(--border);
	}
	.notes-list {
		padding: 12px;
		border-right: 1px solid var(--border);
		overflow: auto;
	}
	.notes-list button {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: 3px;
		margin-bottom: 4px;
		padding: 9px 10px;
		border-radius: 9px;
		text-align: left;
	}
	.notes-list button:hover,
	.notes-list button.active {
		background: var(--accent);
	}
	.note-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 540;
	}
	.note-meta {
		color: var(--muted-foreground);
		font-size: 10px;
	}
	.notes-empty {
		padding: 10px;
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.note-editor {
		display: flex;
		flex-direction: column;
		padding: 20px 26px;
		overflow: auto;
	}
	.note-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.note-title {
		font-size: 17px;
		font-weight: 650;
	}
	.tool-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tool-actions :global(svg) {
		width: 15px;
	}
	.notes-toggle {
		display: inline-flex;
		gap: 2px;
		margin-right: 4px;
	}
	.notes-toggle button {
		padding: 3px 9px;
		border-radius: 6px;
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.notes-toggle button.active {
		background: var(--accent);
		color: var(--foreground);
	}
	:global(.note-textarea) {
		min-height: 46vh;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 13px;
		line-height: 1.6;
		resize: vertical;
	}
	.markdown {
		min-height: 46vh;
		padding: 14px 16px;
		border: 1px solid var(--border);
		border-radius: 12px;
		font-size: 13px;
		line-height: 1.65;
	}
	.markdown :global(h1),
	.markdown :global(h2),
	.markdown :global(h3) {
		margin: 12px 0 8px;
	}
	.markdown :global(p) {
		margin: 0 0 10px;
	}
	.markdown :global(ul),
	.markdown :global(ol) {
		padding-left: 20px;
		margin: 0 0 10px;
	}
	.markdown :global(pre) {
		padding: 10px;
		overflow: auto;
		border-radius: 8px;
		background: var(--muted);
		font-size: 12px;
	}
	.bookmarks {
		margin-top: 18px;
	}
	.bookmarks h2 {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 8px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.bookmarks h2 :global(svg) {
		width: 13px;
	}
	.bookmarks li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 0;
		border-bottom: 1px solid var(--border);
		font-size: 12px;
	}
	.bookmark-path {
		color: var(--primary);
	}
	.bookmark-remove {
		color: var(--muted-foreground);
		font-size: 15px;
	}
	.note-placeholder {
		display: grid;
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
	.note-placeholder h2 {
		color: var(--foreground);
		font-size: 16px;
	}
	.note-placeholder p {
		max-width: 300px;
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.55;
	}
	@media (max-width: 767px) {
		.notes-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}
		.notes-list {
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}
	}
</style>
