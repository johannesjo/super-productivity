<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';
	import CheckSquareIcon from '@lucide/svelte/icons/square-check-big';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import * as Command from '$lib/components/ui/command';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
</script>

<Command.Dialog
	bind:open={model.searchOpen}
	title="Search Noura"
	description="Search tasks, projects, views, and settings"
	class="command-dialog"
>
	<Command.Input placeholder="Search tasks, projects and commands…" />
	<Command.List>
		<Command.Empty>No matching tasks or commands.</Command.Empty>
		<Command.Group heading="Tasks">
			{#each model.allTasks.slice(0, 8) as task (task.id)}<Command.Item
					value={task.title}
					onclick={() => {
						model.selectTask(task.id);
						model.searchOpen = false;
					}}><CheckSquareIcon />{task.title}</Command.Item
				>{/each}
		</Command.Group>
		<Command.Separator />
		<Command.Group heading="Navigate">
			<Command.Item
				onclick={() => {
					model.view = 'today';
					model.searchOpen = false;
				}}><CalendarIcon />Today<Command.Shortcut>⌘1</Command.Shortcut></Command.Item
			>
			<Command.Item
				onclick={() => {
					model.view = 'project';
					model.searchOpen = false;
				}}><FolderIcon />Projects<Command.Shortcut>⌘2</Command.Shortcut></Command.Item
			>
			<Command.Item
				onclick={() => {
					model.searchOpen = false;
					model.settingsOpen = true;
				}}><SettingsIcon />Settings<Command.Shortcut>⌘,</Command.Shortcut></Command.Item
			>
		</Command.Group>
	</Command.List>
</Command.Dialog>

<style>
	:global(.command-dialog) {
		min-height: 460px;
	}
</style>
