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

		expect(Object.values(model.state.sessions)).toHaveLength(1);
		expect(model.selectedTask?.trackedMs).toBe(15 * 60_000);
	});
});
