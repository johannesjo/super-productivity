import { describe, expect, it } from 'vitest';
import { NouraModel } from './model.svelte';

describe('NouraModel', () => {
	it('creates, selects, completes, and filters a local task', async () => {
		const model = new NouraModel();
		const originalCount = model.visibleTasks.length;

		await model.addTask('Write migration notes');
		const task = model.visibleTasks.find(
			(candidate) => candidate.title === 'Write migration notes'
		);

		expect(task).toBeDefined();
		expect(model.visibleTasks).toHaveLength(originalCount + 1);

		await model.selectTask(task?.id);
		expect(model.selectedTask?.title).toBe('Write migration notes');

		if (task) await model.toggleTask(task.id);
		expect(model.visibleTasks.some((candidate) => candidate.id === task?.id)).toBe(false);
	});

	it('ignores empty quick-capture input', async () => {
		const model = new NouraModel();
		const before = model.allTasks.length;

		await model.addTask('   ');

		expect(model.allTasks).toHaveLength(before);
	});

	it('creates projects and exposes priority and completed smart lists', async () => {
		const model = new NouraModel();
		await model.addProject('Migration');
		expect(model.activeProject?.title).toBe('Migration');

		await model.addTask('Ship the migration');
		const task = model.selectedTask;
		if (!task) throw new Error('Expected a selected task');
		await model.setPriority(task.id, 3);
		model.view = 'priority';
		expect(model.visibleTasks.map((candidate) => candidate.id)).toContain(task.id);

		await model.toggleTask(task.id);
		model.view = 'completed';
		expect(model.visibleTasks.map((candidate) => candidate.id)).toContain(task.id);
	});

	it('captures tasks with planner and board context', async () => {
		const model = new NouraModel();
		model.openTaskCapture({ dueDay: '2026-07-20', projectId: 'study' });
		model.taskCaptureTitle = 'Prepare the study plan';

		await model.commitTaskCapture();

		expect(model.selectedTask).toMatchObject({
			title: 'Prepare the study plan',
			dueDay: '2026-07-20',
			projectId: 'study',
			status: 'open'
		});
		expect(model.taskCaptureOpen).toBe(false);
	});

	it('opens full-view task details after selecting a task', async () => {
		const model = new NouraModel();
		await model.addTask('Inspect from board');
		const id = model.selectedTask?.id;
		if (!id) throw new Error('Expected a selected task');
		model.taskDetailsOpen = false;

		await model.openTaskDetails(id);

		expect(model.selectedTask?.id).toBe(id);
		expect(model.taskDetailsOpen).toBe(true);
	});

	it('adds manual focus records and attributes time to the selected task', async () => {
		const model = new NouraModel();
		await model.addTask('Focused task');

		await model.recordFocusSession('pomodoro', 15 * 60_000, 2_000_000);

		expect(Object.values(model.state.trackedEntries)).toHaveLength(1);
		expect(model.selectedTask?.trackedMs).toBe(15 * 60_000);
	});

	it('parses capture syntax: priority, tags, project, due, and subtask chain', async () => {
		const model = new NouraModel();
		await model.addProject('Operations');
		const operationsId = model.state.activeProjectId;
		await model.selectProject(operationsId);

		await model.addTask('Deploy #release p2 @Operations due:tomorrow');
		const task = model.selectedTask;
		expect(task).toMatchObject({
			title: 'Deploy',
			priority: 2,
			projectId: operationsId,
			dueDay: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
		});
		expect(task?.tagIds.length).toBe(1);
		expect(Object.values(model.state.tags).some((tag) => tag.title === 'release')).toBe(true);

		await model.addTask('Project > Milestone > Ship');
		const leaf = model.selectedTask;
		expect(leaf?.title).toBe('Ship');
		expect(leaf?.parentId).toBeDefined();
		const parent = leaf ? model.state.tasks[leaf.parentId ?? ''] : undefined;
		expect(parent?.title).toBe('Milestone');
		expect(parent?.parentId).toBeDefined();
	});

	it('parses repeat syntax into a repeat config reference', async () => {
		const model = new NouraModel();
		await model.addTask('Standup repeat:daily');
		const task = model.selectedTask;
		expect(task?.repeatCfgId).toBeDefined();
		expect(Object.values(model.state.taskRepeatCfgs)).toHaveLength(1);
	});

	it('adds, links, indents, dedents, renames, and reorders subtask trees', async () => {
		const model = new NouraModel();
		// addSubtask requires a real parent; empty input is ignored
		await model.addSubtask('', '');
		await model.addTask('Parent');
		const parent = model.selectedTask;
		if (!parent) throw new Error('Expected parent task');

		const childId = await model.addSubtask(parent.id, 'Child');
		expect(childId).toBeDefined();
		const child = childId ? model.state.tasks[childId] : undefined;
		expect(child?.parentId).toBe(parent.id);
		expect(model.state.tasks[parent.id]?.subtaskIds).toContain(childId);

		await model.addTask('Sibling');
		const sibling = model.selectedTask;
		const siblingId = sibling?.id;
		expect(siblingId).toBeDefined();
		if (!siblingId) return;

		// indent sibling under child
		await model.indentTask(siblingId, childId);
		expect(model.state.tasks[siblingId]?.parentId).toBe(childId);
		expect(child ? model.state.tasks[child.id]?.subtaskIds : []).toContain(siblingId);

		// dedent sibling back to top level
		await model.dedentTask(siblingId);
		expect(model.state.tasks[siblingId]?.parentId).toBeUndefined();

		await model.renameTask(parent.id, 'Renamed parent');
		expect(model.state.tasks[parent.id]?.title).toBe('Renamed parent');

		const before = model.state.taskOrder;
		await model.reorderTasks([...before].reverse());
		expect(model.state.taskOrder).toEqual([...before].reverse());
	});

	it('handles smart lists, tags, and archives from the sidebar', async () => {
		const model = new NouraModel();
		await model.addTask('Low priority item');
		const low = model.selectedTask;
		if (!low) throw new Error('Expected task');
		await model.addTask('Important task p2');
		const high = model.selectedTask;
		if (!high) throw new Error('Expected task');

		const listId = await model.addSmartList('High focus', [{ type: 'PRIORITY', value: '2' }]);
		expect(listId).toBeDefined();
		expect(model.view).toBe('smartlist');
		expect(model.visibleTasks.map((task) => task.id)).toContain(high.id);
		expect(model.visibleTasks.map((task) => task.id)).not.toContain(low.id);

		const tagId = await model.addTag('release');
		expect(tagId).toBeDefined();
		await model.updateTask(high.id, { tagIds: tagId ? [tagId] : [] });
		await model.selectTag(tagId as string);
		expect(model.view).toBe('tag');
		expect(model.visibleTasks.map((task) => task.id)).toContain(high.id);
		expect(model.visibleTasks.map((task) => task.id)).not.toContain(low.id);

		await model.toggleTask(high.id);
		await model.selectArchives();
		expect(model.view).toBe('archives');
		expect(
			Object.values(model.state.tasks).filter((task) => task.status === 'archived')
		).toHaveLength(0);
		// archives view has none yet; restore flow uses task/archive
		await model.selectTag(tagId as string);
	});

	it('tracks per-task time and stops with attribution', async () => {
		const model = new NouraModel();
		await model.addTask('Tracked task');
		const task = model.selectedTask;
		if (!task) throw new Error('Expected task');

		await model.startTrackingForTask(task.id);
		expect(model.trackingTaskId()).toBe(task.id);
		expect(model.state.activeSessionId).toBeDefined();

		await model.stopTracking();
		expect(model.state.activeSessionId).toBeUndefined();
		expect(model.trackingTaskId()).toBeUndefined();
		const entry = Object.values(model.state.trackedEntries)[0];
		expect(model.state.tasks[task.id]?.trackedMs).toBe(entry?.durationMs ?? 0);
		expect(entry?.taskId).toBe(task.id);
	});

	it('applies and clears an engine-backed repeat config', async () => {
		const model = new NouraModel();
		await model.addTask('Standup');
		const task = model.selectedTask;
		if (!task) throw new Error('Expected task');

		await model.applyRepeat(task.id, { repeatEvery: 1, repeatEveryUnit: 'DAILY', daysOfWeek: [] });
		expect(model.state.tasks[task.id]?.repeatCfgId).toBeDefined();
		expect(Object.values(model.state.taskRepeatCfgs)).toHaveLength(1);
		expect(model.state.tasks[task.id]?.repeatRule).toMatch(/Every 1 day/);

		await model.applyRepeat(task.id, {
			repeatEvery: 2,
			repeatEveryUnit: 'WEEKLY',
			daysOfWeek: [1, 4]
		});
		const cfg = model.state.taskRepeatCfgs[model.state.tasks[task.id]!.repeatCfgId!];
		expect(cfg?.repeatEveryUnit).toBe('WEEKLY');
		expect(cfg?.daysOfWeek).toEqual([1, 4]);

		await model.clearRepeat(task.id);
		expect(model.state.tasks[task.id]?.repeatCfgId).toBeUndefined();
	});

	it('creates, edits, bookmarks, and removes notes', async () => {
		const model = new NouraModel();
		const noteId = await model.addNote('Weekly plan');
		expect(noteId).toBeDefined();
		expect(model.selectedNoteId).toBe(noteId);
		expect(model.selectedNote?.content).toContain('Weekly plan');

		await model.updateNote(noteId as string, { content: '# Weekly plan\n\nReview metrics' });
		expect(model.selectedNote?.content).toContain('Review metrics');

		await model.addBookmark(noteId as string, 'notes/metrics.qmd');
		expect(model.state.notes[noteId as string]?.bookmarks).toHaveLength(1);
		const bookmarkId = model.state.notes[noteId as string]?.bookmarks[0]?.id;
		await model.removeBookmark(noteId as string, bookmarkId as string);
		expect(model.state.notes[noteId as string]?.bookmarks).toHaveLength(0);

		await model.removeNote(noteId as string);
		expect(model.state.notes[noteId as string]).toBeUndefined();
		expect(model.selectedNoteId).toBeUndefined();
	});

	it('persists global configuration through config/update', async () => {
		const model = new NouraModel();
		expect(model.config.themeMode).toBe('dark');
		await model.updateConfig({ themeMode: 'light', language: 'de', trackingReminderMinute: 30 });
		expect(model.state.config).toMatchObject({
			themeMode: 'light',
			language: 'de',
			trackingReminderMinute: 30
		});
		expect(model.config.language).toBe('de');
	});

	it('removes a project and moves its tasks to the fallback', async () => {
		const model = new NouraModel();
		await model.addProject('Temp');
		const projectId = model.state.activeProjectId;
		await model.addTask('Loose task');
		await model.removeProject(projectId);
		expect(model.state.projects[projectId]).toBeUndefined();
		expect(
			Object.values(model.state.tasks).some(
				(task) => task.projectId === projectId && task.title === 'Loose task'
			)
		).toBe(false);
	});
});
