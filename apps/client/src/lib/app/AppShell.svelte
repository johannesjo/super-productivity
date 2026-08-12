<script lang="ts">
	import { onMount } from 'svelte';
	import { createTranslator } from '@noura/application';
	import { DEFAULT_SHORTCUTS, selectSmartListTasks, type SmartList } from '@noura/domain';
	import BarChart3Icon from '@lucide/svelte/icons/chart-no-axes-combined';
	import BellIcon from '@lucide/svelte/icons/bell';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import BriefcaseIcon from '@lucide/svelte/icons/briefcase';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CheckSquareIcon from '@lucide/svelte/icons/square-check-big';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CircleDotIcon from '@lucide/svelte/icons/circle-dot';
	import Columns3Icon from '@lucide/svelte/icons/columns-3';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import Grid3x3Icon from '@lucide/svelte/icons/grid-3x3';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import NotebookIcon from '@lucide/svelte/icons/notebook';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import SunIcon from '@lucide/svelte/icons/sun';
	import TagIcon from '@lucide/svelte/icons/tag';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import * as Resizable from '$lib/components/ui/resizable';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import FocusView from './FocusView.svelte';
	import ActivityDialog from './ActivityDialog.svelte';
	import BoardView from './BoardView.svelte';
	import EisenhowerView from './EisenhowerView.svelte';
	import HistoryView from './HistoryView.svelte';
	import InsightsView from './InsightsView.svelte';
	import NotesView from './NotesView.svelte';
	import OrgDialog from './OrgDialog.svelte';
	import PlannerView from './PlannerView.svelte';
	import ScheduleView from './ScheduleView.svelte';
	import SearchDialog from './SearchDialog.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import TaskInspector from './TaskInspector.svelte';
	import TaskCaptureDialog from './TaskCaptureDialog.svelte';
	import TaskWorkspace from './TaskWorkspace.svelte';
	import { model } from './model.svelte';

	const railItems = [
		{ view: 'today', i18n: 'nav.tasks', icon: CheckSquareIcon },
		{ view: 'planner', i18n: 'nav.planner', icon: CalendarDaysIcon },
		{ view: 'schedule', i18n: 'nav.schedule', icon: CalendarClockIcon },
		{ view: 'eisenhower', i18n: 'nav.eisenhower', icon: Grid3x3Icon },
		{ view: 'boards', i18n: 'nav.boards', icon: Columns3Icon },
		{ view: 'focus', i18n: 'nav.focus', icon: TimerIcon },
		{ view: 'search', i18n: 'nav.search', icon: SearchIcon },
		{ view: 'notes', i18n: 'nav.notes', icon: NotebookIcon },
		{ view: 'history', i18n: 'nav.history', icon: HistoryIcon },
		{ view: 'insights', i18n: 'nav.insights', icon: BarChart3Icon }
	] as const;

	const t = $derived(createTranslator(model.config.language));

	const matchesShortcut = (event: KeyboardEvent, accelerator: string): boolean => {
		const bindings = model.config.shortcutBindings ?? DEFAULT_SHORTCUTS;
		const value = bindings[accelerator] ?? DEFAULT_SHORTCUTS[accelerator] ?? '';
		const segments = value.split('+');
		const wantsMeta = segments.includes('CmdOrCtrl');
		const key = segments.at(-1)?.toLowerCase();
		const normalizedKey = key === 'space' ? ' ' : key;
		if (wantsMeta && !(event.metaKey || event.ctrlKey)) return false;
		return Boolean(normalizedKey && event.key.toLowerCase() === normalizedKey);
	};

	onMount(() => {
		void model.hydrate();
		model.applyTheme();
	});

	$effect(() => {
		void model.state.config.themeMode;
		model.applyTheme();
	});

	function railAction(view: (typeof railItems)[number]['view']): void {
		if (view === 'search') model.searchOpen = true;
		else model.view = view;
	}

	async function addProject(): Promise<void> {
		const title = window.prompt('Project name');
		if (title) await model.addProject(title);
	}

	async function addSmartList(): Promise<void> {
		const title = window.prompt('Smart list name');
		if (title) await model.addSmartList(title);
	}

	async function addTag(): Promise<void> {
		const title = window.prompt('Tag name');
		const trimmed = title?.trim();
		if (!trimmed) return;
		await model.addTag(trimmed);
	}

	const smartListCount = (list: SmartList): number =>
		selectSmartListTasks(model.state, list).length;
</script>

<svelte:window
	onkeydown={(event) => {
		if (matchesShortcut(event, 'search.open')) {
			event.preventDefault();
			model.searchOpen = true;
		}
		if (matchesShortcut(event, 'settings.open')) {
			event.preventDefault();
			model.settingsOpen = true;
		}
	}}
/>

<Tooltip.Provider>
	<div class="app-shell">
		<nav class="rail" aria-label="Primary navigation" data-tauri-drag-region>
			<div class="traffic-lights" aria-hidden="true"><i></i><i></i><i></i></div>
			<div class="brand" aria-label="Noura">N</div>
			<div class="rail-main">
				{#each railItems as item (item.view)}
					<Tooltip.Root
						><Tooltip.Trigger
							><button
								type="button"
								class:active={item.view === 'search' ? model.searchOpen : model.view === item.view}
								aria-label={t(item.i18n)}
								onclick={() => railAction(item.view)}><item.icon /></button
							></Tooltip.Trigger
						><Tooltip.Content side="right">{t(item.i18n)}</Tooltip.Content></Tooltip.Root
					>
				{/each}
			</div>
			<div class="rail-bottom">
				<Tooltip.Root
					><Tooltip.Trigger
						><button
							type="button"
							class="sync-indicator"
							aria-label={`Sync: ${model.syncStatus}`}
							onclick={() => (model.settingsOpen = true)}
							><span class={`sync-dot status-${model.syncStatus}`}></span></button
						></Tooltip.Trigger
					><Tooltip.Content side="right">Sync: {model.syncStatus}</Tooltip.Content></Tooltip.Root
				>
				<button
					type="button"
					aria-label="Activity"
					class:active={model.activityOpen}
					onclick={() => (model.activityOpen = true)}><BellIcon /></button
				>
				<button
					type="button"
					aria-label="Settings"
					class:active={model.settingsOpen}
					onclick={() => (model.settingsOpen = true)}><SettingsIcon /></button
				>
			</div>
		</nav>

		{#if model.view === 'focus'}
			<main class="full-main"><FocusView {model} /></main>
		{:else if model.view === 'planner'}
			<main class="full-main"><PlannerView {model} /></main>
		{:else if model.view === 'schedule'}
			<main class="full-main"><ScheduleView {model} /></main>
		{:else if model.view === 'boards'}
			<main class="full-main"><BoardView {model} /></main>
		{:else if model.view === 'eisenhower'}
			<main class="full-main"><EisenhowerView {model} /></main>
		{:else if model.view === 'history'}
			<main class="full-main"><HistoryView {model} /></main>
		{:else if model.view === 'notes'}
			<main class="full-main"><NotesView {model} /></main>
		{:else if model.view === 'insights'}
			<main class="full-main"><InsightsView {model} /></main>
		{:else}
			<div class="desktop-workspace">
				<Resizable.PaneGroup direction="horizontal" autoSaveId="noura-task-layout">
					<Resizable.Pane defaultSize={20} minSize={16} maxSize={27}>
						<aside class="sidebar" aria-label="Task navigation">
							<header>
								<Button variant="ghost" size="icon" class="mobile-menu" aria-label="Open navigation"
									><MenuIcon /></Button
								><span>Noura</span><Button
									variant="ghost"
									size="icon"
									aria-label="Add project"
									onclick={addProject}><PlusIcon /></Button
								>
							</header>
							<nav>
								<button
									class:active={model.view === 'today'}
									type="button"
									onclick={() => (model.view = 'today')}
									><SunIcon /><span>{t('nav.today')}</span><small
										>{model.allTasks.filter(
											(task) =>
												task.dueDay === new Date().toISOString().slice(0, 10) &&
												task.status === 'open'
										).length}</small
									></button
								>
								<button
									class:active={model.view === 'upcoming'}
									type="button"
									onclick={() => (model.view = 'upcoming')}
									><CalendarDaysIcon /><span>{t('nav.upcoming')}</span></button
								>
								<button
									class:active={model.view === 'project' && model.state.activeProjectId === 'inbox'}
									type="button"
									onclick={() => model.selectProject('inbox')}
									><InboxIcon /><span>{t('nav.inbox')}</span><small
										>{model.allTasks.filter(
											(task) => task.projectId === 'inbox' && task.status === 'open'
										).length}</small
									></button
								>
							</nav>
							<Separator />
							<section>
								<h2>
									{t('nav.projects')}
									<Button variant="ghost" size="icon" aria-label="Add project" onclick={addProject}
										><PlusIcon /></Button
									>
								</h2>
								{#each model.projects as project (project.id)}<button
										class:active={model.view === 'project' &&
											model.state.activeProjectId === project.id}
										type="button"
										onclick={() => model.selectProject(project.id)}
										><BookOpenIcon /><span>{project.title}</span><ChevronRightIcon /></button
									>{/each}
							</section>
							<section>
								<h2>
									{t('nav.smartLists')}
									<Button
										variant="ghost"
										size="icon"
										aria-label="Add smart list"
										onclick={() => addSmartList()}><PlusIcon /></Button
									>
								</h2>
								<button
									class:active={model.view === 'priority'}
									type="button"
									onclick={() => (model.view = 'priority')}
									><SparklesIcon /><span>{t('nav.highPriority')}</span></button
								>
								{#each model.smartLists as list (list.id)}<button
										class:active={model.view === 'smartlist' &&
											model.state.smartLists[model.activeSmartListId ?? '']?.id === list.id}
										type="button"
										onclick={() => model.selectSmartList(list.id)}
										><SparklesIcon /><span>{list.title}</span><small>{smartListCount(list)}</small
										></button
									>{/each}
								<button
									class:active={model.view === 'completed'}
									type="button"
									onclick={() => (model.view = 'completed')}
									><CircleDotIcon /><span>{t('nav.completed')}</span></button
								>
								<button
									class:active={model.view === 'archives'}
									type="button"
									onclick={() => model.selectArchives()}
									><ArchiveIcon /><span>{t('nav.archives')}</span><small
										>{Object.values(model.state.tasks).filter((task) => task.status === 'archived')
											.length}</small
									></button
								>
							</section>
							<section>
								<h2>
									{t('nav.tags')}
									<Button variant="ghost" size="icon" aria-label="Add tag" onclick={() => addTag()}
										>+</Button
									>
								</h2>
								{#each model.tags as tag (tag.id)}<button
										class:active={model.view === 'tag' && model.activeTagId === tag.id}
										type="button"
										onclick={() => model.selectTag(tag.id)}
										><TagIcon /><span>{tag.title}</span><small
											>{Object.values(model.state.tasks).filter(
												(task) => task.tagIds.includes(tag.id) && task.status === 'open'
											).length}</small
										></button
									>{/each}
							</section>
							{#if model.workContexts.length > 1}<section>
									<h2>Work contexts</h2>
									{#each model.workContexts as context (context.id)}<button
											class:active={model.state.activeWorkContextId === context.id}
											type="button"
											onclick={() => model.selectWorkContext(context.id)}
											><BriefcaseIcon /><span>{context.title}</span></button
										>{/each}
								</section>{/if}
							<div class="sidebar-footer">
								<button type="button" onclick={() => (model.orgOpen = true)}
									><FolderIcon /><span>Projects & tags</span></button
								>
								<button type="button" onclick={() => (model.settingsOpen = true)}
									><SettingsIcon /><span>{t('nav.settings')}</span></button
								>
							</div>
						</aside>
					</Resizable.Pane>
					<Resizable.Handle />
					<Resizable.Pane defaultSize={51} minSize={38}>
						<TaskWorkspace {model} />
					</Resizable.Pane>
					<Resizable.Handle />
					<Resizable.Pane defaultSize={29} minSize={23} maxSize={40}>
						<TaskInspector {model} />
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</div>
			<div class="mobile-workspace"><TaskWorkspace {model} /></div>
		{/if}
		<nav class="bottom-nav" aria-label="Mobile navigation">
			{#each railItems.slice(0, 5) as item (item.view)}<button
					type="button"
					class:active={item.view === 'search' ? model.searchOpen : model.view === item.view}
					onclick={() => railAction(item.view)}><item.icon /><span>{t(item.i18n)}</span></button
				>{/each}
		</nav>
	</div>
</Tooltip.Provider>

<SearchDialog {model} />
<SettingsDialog {model} />
<ActivityDialog {model} />
<TaskCaptureDialog {model} />
<OrgDialog {model} />

<Sheet.Root bind:open={model.taskDetailsOpen}>
	<Sheet.Content side="right" class="task-details-sheet" showCloseButton={false}>
		<Sheet.Header class="sr-only">
			<Sheet.Title>Task details</Sheet.Title>
			<Sheet.Description>Edit the selected task</Sheet.Description>
		</Sheet.Header>
		<TaskInspector {model} />
	</Sheet.Content>
</Sheet.Root>

<style>
	.app-shell {
		display: grid;
		width: 100vw;
		height: 100dvh;
		grid-template-columns: 56px minmax(0, 1fr);
		overflow: hidden;
		background: var(--background);
	}
	.rail {
		display: flex;
		align-items: center;
		flex-direction: column;
		padding: 12px 6px;
		background: color-mix(in oklch, var(--sidebar) 88%, var(--background));
		border-right: 1px solid var(--border);
	}
	.traffic-lights {
		display: flex;
		gap: 5px;
		height: 16px;
		align-items: center;
	}
	.traffic-lights i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--muted-foreground);
		opacity: 0.45;
	}
	.brand {
		display: grid;
		width: 34px;
		height: 34px;
		margin-top: 12px;
		place-content: center;
		border-radius: 11px;
		background: var(--foreground);
		color: var(--background);
		font-size: 13px;
		font-weight: 800;
	}
	.rail-main,
	.rail-bottom {
		display: flex;
		align-items: center;
		flex-direction: column;
		gap: 7px;
	}
	.rail-main {
		margin-top: 28px;
	}
	.rail-bottom {
		margin-top: auto;
	}
	.rail button {
		display: grid;
		width: 40px;
		height: 40px;
		place-content: center;
		border-radius: 10px;
		color: var(--muted-foreground);
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}
	.rail button:hover,
	.rail button.active {
		background: var(--accent);
		color: var(--foreground);
	}
	.sync-indicator {
		display: grid;
		place-content: center;
	}
	.sync-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--muted-foreground);
		opacity: 0.7;
	}
	.sync-dot.status-connected {
		background: #22c55e;
		opacity: 1;
	}
	.sync-dot.status-connecting {
		background: #f59e0b;
		animation: pulse 1.2s ease-in-out infinite;
	}
	.sync-dot.status-error {
		background: #ef4444;
		opacity: 1;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
	.rail :global(svg) {
		width: 20px;
	}
	.full-main,
	.desktop-workspace {
		min-width: 0;
		height: 100%;
	}
	.sidebar {
		position: relative;
		height: 100%;
		overflow: auto;
		padding: 20px 12px;
		background: var(--sidebar);
	}
	.sidebar header {
		display: flex;
		height: 38px;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
		padding: 0 4px 0 10px;
		font-weight: 680;
	}
	.sidebar nav,
	.sidebar section {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.sidebar section {
		margin-top: 18px;
	}
	.sidebar h2 {
		display: flex;
		height: 32px;
		align-items: center;
		justify-content: space-between;
		padding-left: 10px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 620;
		text-transform: uppercase;
		letter-spacing: 0.055em;
	}
	.sidebar nav button,
	.sidebar section > button,
	.sidebar-footer button {
		display: grid;
		min-height: 38px;
		grid-template-columns: 19px 1fr auto;
		align-items: center;
		gap: 10px;
		padding: 0 10px;
		border-radius: 9px;
		color: var(--muted-foreground);
		font-size: 13px;
		text-align: left;
	}
	.sidebar nav button:hover,
	.sidebar nav button.active,
	.sidebar section > button:hover,
	.sidebar section > button.active {
		background: var(--sidebar-accent);
		color: var(--sidebar-accent-foreground);
	}
	.sidebar button :global(svg) {
		width: 17px;
	}
	.sidebar small {
		font-size: 10px;
	}
	.sidebar-footer {
		position: absolute;
		bottom: 14px;
		left: 12px;
		right: 12px;
	}
	:global(.mobile-menu),
	.mobile-workspace,
	.bottom-nav {
		display: none;
	}
	@media (max-width: 1279px) {
		.desktop-workspace :global([data-pane]:last-child) {
			display: none;
		}
	}
	@media (max-width: 959px) {
		.desktop-workspace :global([data-pane]:first-child),
		.desktop-workspace :global([data-pane-resizer]:first-of-type) {
			display: none;
		}
	}
	@media (max-width: 639px) {
		.app-shell {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(0, 1fr) 58px;
		}
		.rail,
		.desktop-workspace {
			display: none;
		}
		.mobile-workspace {
			display: block;
			min-height: 0;
		}
		.bottom-nav {
			display: grid;
			grid-row: 2;
			grid-template-columns: repeat(5, 1fr);
			border-top: 1px solid var(--border);
			background: var(--background);
		}
		.bottom-nav button {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			gap: 3px;
			color: var(--muted-foreground);
			font-size: 9px;
		}
		.bottom-nav button.active {
			color: var(--primary);
		}
		.bottom-nav :global(svg) {
			width: 18px;
		}
	}
	:global(.task-details-sheet) {
		width: min(460px, 92vw);
		max-width: none;
		padding: 0;
	}
</style>
