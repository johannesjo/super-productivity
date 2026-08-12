<script lang="ts">
	import { searchDomain } from '@noura/application';
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';
	import CheckSquareIcon from '@lucide/svelte/icons/square-check-big';
	import Columns3Icon from '@lucide/svelte/icons/columns-3';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import Grid3x3Icon from '@lucide/svelte/icons/grid-3x3';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import NotebookIcon from '@lucide/svelte/icons/notebook';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import * as Command from '$lib/components/ui/command';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let query = $state('');

	const results = $derived(searchDomain(model.state, query, { limit: 14, minScore: 1 }));

	const grouped = $derived.by(() => ({
		tasks: results.filter((result) => result.kind === 'task'),
		notes: results.filter((result) => result.kind === 'note'),
		projects: results.filter((result) => result.kind === 'project'),
		tags: results.filter((result) => result.kind === 'tag')
	}));

	const actions = $derived(
		[
			{
				id: 'today',
				label: 'Today',
				icon: CalendarIcon,
				shortcut: '⌘1',
				run: () => (model.view = 'today')
			},
			{ id: 'upcoming', label: 'Upcoming', icon: InboxIcon, run: () => (model.view = 'upcoming') },
			{ id: 'boards', label: 'Boards', icon: Columns3Icon, run: () => (model.view = 'boards') },
			{ id: 'focus', label: 'Focus', icon: TimerIcon, run: () => (model.view = 'focus') },
			{
				id: 'eisenhower',
				label: 'Eisenhower',
				icon: Grid3x3Icon,
				run: () => (model.view = 'eisenhower')
			},
			{ id: 'notes', label: 'Notes', icon: NotebookIcon, run: () => (model.view = 'notes') },
			{ id: 'history', label: 'History', icon: HistoryIcon, run: () => (model.view = 'history') },
			{
				id: 'insights',
				label: 'Insights',
				icon: Grid3x3Icon,
				run: () => (model.view = 'insights')
			},
			{
				id: 'settings',
				label: 'Settings',
				icon: SettingsIcon,
				shortcut: '⌘,',
				run: () => (model.settingsOpen = true)
			}
		].filter((action) => action.label.toLowerCase().includes(query.toLowerCase()))
	);

	function close(): void {
		model.searchOpen = false;
	}
</script>

<Command.Dialog
	bind:open={model.searchOpen}
	title="Search Noura"
	description="Search tasks, notes, tags, projects and commands"
	class="command-dialog"
>
	<Command.Input bind:value={query} placeholder="Search tasks, notes, projects…" />
	<Command.List>
		<Command.Empty>No matches — try another phrase.</Command.Empty>
		{#if grouped.tasks.length}<Command.Group heading="Tasks">
				{#each grouped.tasks as result (result.id)}<Command.Item
						value={result.title}
						onclick={() => {
							model.selectTask(result.id);
							close();
						}}><CheckSquareIcon />{result.title}</Command.Item
					>{/each}
			</Command.Group>{/if}
		{#if grouped.notes.length}<Command.Group heading="Notes">
				{#each grouped.notes as result (result.id)}<Command.Item
						value={result.title}
						onclick={() => {
							model.view = 'notes';
							model.selectNote(result.id);
							close();
						}}><NotebookIcon />{result.title}</Command.Item
					>{/each}
			</Command.Group>{/if}
		{#if grouped.projects.length}<Command.Group heading="Projects">
				{#each grouped.projects as result (result.id)}<Command.Item
						value={result.title}
						onclick={() => {
							void model.selectProject(result.id);
							close();
						}}><FolderIcon />{result.title}</Command.Item
					>{/each}
			</Command.Group>{/if}
		{#if grouped.tags.length}<Command.Group heading="Tags">
				{#each grouped.tags as result (result.id)}<Command.Item
						value={result.title}
						onclick={() => {
							model.selectTag(result.id);
							close();
						}}><TagIcon />{result.title}</Command.Item
					>{/each}
			</Command.Group>{/if}
		{#if actions.length}<Command.Separator />
			<Command.Group heading="Actions">
				{#each actions as action (action.id)}<Command.Item
						value={action.label}
						onclick={() => {
							action.run();
							close();
						}}
						><action.icon />{action.label}{#if action.shortcut}<Command.Shortcut
								>{action.shortcut}</Command.Shortcut
							>{/if}</Command.Item
					>{/each}
			</Command.Group>{/if}
	</Command.List>
</Command.Dialog>

<style>
	:global(.command-dialog) {
		min-height: 460px;
	}
</style>
