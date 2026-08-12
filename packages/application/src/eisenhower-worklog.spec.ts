import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  migrateDomainState,
  reduceDomain,
  type Task,
} from '@noura/domain';
import {
  buildWorklogRows,
  eisenhowerBuckets,
  eisenhowerQuadrant,
  isImportant,
  isUrgent,
  recentHistory,
  worklogToCsv,
} from './index';

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

const today = '2026-07-20';

describe('Eisenhower derivation', () => {
  it('classifies tasks by importance and urgency', () => {
    expect(isImportant(task({ priority: 2 }))).toBe(true);
    expect(isImportant(task({ priority: 0 }))).toBe(false);
    expect(isUrgent(task({ dueDay: '2026-07-20' }), today)).toBe(true);
    expect(isUrgent(task({ dueDay: '2026-07-22' }), today)).toBe(true);
    expect(isUrgent(task({ dueDay: '2026-07-23' }), today)).toBe(false);
    expect(isUrgent(task({}), today)).toBe(false);
  });

  it('buckets a mix of tasks into the four quadrants', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'a', priority: 3, dueDay: '2026-07-19' }) },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'b', priority: 2, dueDay: '2026-08-01' }) },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'c', priority: 0, dueDay: '2026-07-20' }) },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'd', priority: 0, dueDay: '2026-09-01' }) },
    });
    state = reduceDomain(state, {
      type: 'task/add',
      payload: {
        task: task({ id: 'done', priority: 3, dueDay: '2026-07-19', status: 'done' }),
      },
    });

    const buckets = eisenhowerBuckets(state, today);
    expect(buckets.importantUrgent.map((task) => task.id)).toEqual(['a']);
    expect(buckets.importantNotUrgent.map((task) => task.id)).toEqual(['b']);
    expect(buckets.notImportantUrgent.map((task) => task.id)).toEqual(['c']);
    expect(buckets.notImportantNotUrgent.map((task) => task.id)).toEqual(['d']);
    expect(eisenhowerQuadrant(task({ priority: 3, dueDay: '2026-07-19' }), today)).toBe(
      'importantUrgent',
    );
  });
});

describe('worklog projection and CSV', () => {
  it('builds timesheet rows from tracked entries and worklogs', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, {
      type: 'task/add',
      payload: { task: task({ id: 'a', title: 'Ship' }) },
    });
    state = reduceDomain(state, {
      type: 'session/manual',
      payload: {
        entry: {
          id: 's1',
          taskId: 'a',
          mode: 'stopwatch',
          startedAt: Date.parse('2026-07-20T09:00:00Z'),
          endedAt: Date.parse('2026-07-20T10:00:00Z'),
          durationMs: 3_600_000,
          date: '2026-07-20',
          source: 'manual',
          updatedAt: Date.parse('2026-07-20T10:00:00Z'),
        },
      },
    });
    const rows = buildWorklogRows(state);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ taskTitle: 'Ship', durationMs: 3_600_000 });
  });

  it('exports a CSV that escapes commas, quotes and newlines', () => {
    const csv = worklogToCsv([
      {
        id: 'r1',
        date: '2026-07-20',
        taskTitle: 'Ship, v1 "final"',
        projectTitle: 'Ops',
        startedAt: '2026-07-20T09:00:00.000Z',
        endedAt: '2026-07-20T10:00:00.000Z',
        durationMs: 3_600_000,
      },
    ]);
    expect(csv).toContain('"Ship, v1 ""final"""');
    expect(csv.split('\n')[0]).toBe(
      'date,task,project,started_utc,ended_utc,duration_ms',
    );
  });

  it('returns a zero-padded 14-day history series', () => {
    const state = migrateDomainState(createInitialState());
    const series = recentHistory(state, 14);
    expect(series).toHaveLength(14);
    expect(series.every((day) => day.tasksDone === 0)).toBe(true);
  });
});
