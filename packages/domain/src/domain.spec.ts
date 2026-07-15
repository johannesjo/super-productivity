import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  migrateLegacyBackupToNoura,
  reduceDomain,
  selectOrderedTasks,
  type Task,
} from './index';

const task: Task = {
  id: 'task-1',
  title: 'Write migration plan',
  notes: '',
  status: 'open',
  priority: 1,
  projectId: 'inbox',
  tagIds: [],
  checklist: [],
  attachments: [],
  estimateMs: 0,
  trackedMs: 0,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
};

describe('reduceDomain', () => {
  it('creates exactly one immutable task transition per command', () => {
    const before = createInitialState(1);
    const after = reduceDomain(before, { type: 'task/add', payload: { task } });
    expect(before.tasks).toEqual({});
    expect(after.tasks[task.id]).toEqual(task);
    expect(after.taskOrder).toEqual([task.id]);
  });

  it('toggles completion deterministically from the supplied logical time', () => {
    const added = reduceDomain(createInitialState(1), {
      type: 'task/add',
      payload: { task },
    });
    const done = reduceDomain(added, {
      type: 'task/toggle',
      payload: { id: task.id, completedAt: 42 },
    });
    expect(done.tasks[task.id]?.status).toBe('done');
    expect(done.tasks[task.id]?.completedAt).toBe(42);
  });

  it('keeps updates fast for a 10,000 task workspace', () => {
    const tasks = Object.fromEntries(
      Array.from({ length: 10_000 }, (_, index) => {
        const id = `task-${index}`;
        return [id, { ...task, id, order: index }];
      }),
    );
    const state = {
      ...createInitialState(1),
      tasks,
      taskOrder: Object.keys(tasks),
    };
    const startedAt = performance.now();
    const after = reduceDomain(state, {
      type: 'task/update',
      payload: { id: 'task-5000', patch: { title: 'Updated' } },
    });
    const ordered = selectOrderedTasks(after);
    expect(ordered).toHaveLength(10_000);
    expect(after.tasks['task-5000']?.title).toBe('Updated');
    expect(performance.now() - startedAt).toBeLessThan(250);
  });
});

describe('migrateLegacyBackupToNoura', () => {
  it('preserves supported Super Productivity data while ignoring plugin state', () => {
    const state = migrateLegacyBackupToNoura(
      {
        data: {
          project: {
            ids: ['INBOX_PROJECT', 'project-study'],
            entities: {
              INBOX_PROJECT: { id: 'INBOX_PROJECT', title: 'Inbox' },
              'project-study': {
                id: 'project-study',
                title: 'Study',
                icon: 'school',
                theme: { primary: '#3b82f6' },
              },
            },
          },
          tag: {
            ids: ['tag-reading'],
            entities: {
              'tag-reading': { id: 'tag-reading', title: 'Reading' },
            },
          },
          task: {
            ids: ['parent', 'child'],
            entities: {
              parent: {
                id: 'parent',
                title: 'Read paper',
                projectId: 'project-study',
                tagIds: ['tag-reading'],
                subTaskIds: ['child'],
                dueDay: '2026-07-20',
                timeEstimate: 3_600_000,
                timeSpent: 600_000,
                created: 10,
                modified: 20,
              },
              child: { id: 'child', title: 'Take notes', isDone: true },
            },
          },
          archiveYoung: {
            task: {
              ids: ['done'],
              entities: {
                done: {
                  id: 'done',
                  title: 'Old task',
                  isDone: true,
                  doneOn: 30,
                },
              },
            },
          },
          plugin: { ids: ['not-migrated'] },
        },
      },
      100,
    );

    expect(state.projects['project-study']?.title).toBe('Study');
    expect(state.tags['tag-reading']?.title).toBe('Reading');
    expect(state.tasks.parent).toMatchObject({
      projectId: 'project-study',
      tagIds: ['tag-reading'],
      dueDay: '2026-07-20',
      estimateMs: 3_600_000,
      trackedMs: 600_000,
    });
    expect(state.tasks.parent?.checklist).toEqual([
      { id: 'child', title: 'Take notes', done: true },
    ]);
    expect(state.tasks.done).toMatchObject({ status: 'done', completedAt: 30 });
    expect(state.taskOrder).toEqual(['parent', 'child', 'done']);
    expect(state).not.toHaveProperty('plugin');
  });

  it('rejects unknown JSON documents', () => {
    expect(() => migrateLegacyBackupToNoura({ hello: 'world' })).toThrow(
      'Unsupported backup format',
    );
  });
});
