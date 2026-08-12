import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  migrateDomainState,
  reduceDomain,
  type Task,
} from '@noura/domain';
import { scheduleOccurrences, selectWeekBuckets, weekDays } from './index';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task',
  notes: '',
  status: 'open',
  priority: 0,
  projectId: 'inbox',
  subtaskIds: [],
  tagIds: [],
  checklist: [],
  sections: [],
  attachments: [],
  estimateMs: 0,
  trackedMs: 0,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
  ...overrides,
});

describe('planner projections', () => {
  it('lists seven week days starting on the given day', () => {
    expect(weekDays('2026-07-13')).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
  });

  it('buckets open tasks by their due day', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'a', dueDay: '2026-07-14', priority: 2 }) },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'b', dueDay: '2026-07-16', status: 'done' }) },
    });
    const buckets = selectWeekBuckets(state, '2026-07-13');
    expect(buckets).toHaveLength(7);
    expect(buckets[1].tasks.map((entry) => entry.id)).toEqual(['a']);
    // done tasks are excluded
    expect(buckets[3].tasks).toEqual([]);
  });

  it('expands repeating tasks into their occurrences within a range', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, {
      type: 'repeatCfg/add',
      payload: {
        cfg: {
          id: 'rc',
          title: 'Weekly Mon',
          repeatEvery: 1,
          repeatEveryUnit: 'WEEKLY',
          daysOfWeek: [1],
          repeatOffset: 0,
          createdAt: 1,
          modifiedAt: 1,
          startDate: '2026-07-01',
        },
      },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'standup', title: 'Standup', repeatCfgId: 'rc' }) },
    });
    const occurrences = scheduleOccurrences(state, '2026-07-13', '2026-07-26');
    expect(occurrences.map((entry) => entry.date)).toEqual(['2026-07-13', '2026-07-20']);
    expect(occurrences[0]?.task.title).toBe('Standup');
  });
});

describe('project remove reducer', () => {
  it('moves tasks and notes to the fallback project and deletes it', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, {
      type: 'project/add',
      payload: {
        project: {
          id: 'p1',
          title: 'P1',
          color: 'blue',
          icon: 'folder',
          archived: false,
          createdAt: 1,
        },
      },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'a', projectId: 'p1' }) },
    });
    state = reduceDomain(state, {
      type: 'note/add',
      payload: {
        note: {
          id: 'n1',
          projectId: 'p1',
          content: '',
          bookmarks: [],
          attachments: [],
          createdAt: 1,
          modifiedAt: 1,
        },
      },
    });
    const after = reduceDomain(state, {
      type: 'project/remove',
      payload: { id: 'p1', fallbackProjectId: 'inbox' },
    });
    expect(after.projects.p1).toBeUndefined();
    expect(after.tasks.a?.projectId).toBe('inbox');
    expect(after.notes.n1?.projectId).toBe('inbox');
  });

  it('refuses to remove the inbox project', () => {
    const state = migrateDomainState(createInitialState());
    const after = reduceDomain(state, {
      type: 'project/remove',
      payload: { id: 'inbox', fallbackProjectId: 'inbox' },
    });
    expect(after.projects.inbox).toBeDefined();
  });
});
