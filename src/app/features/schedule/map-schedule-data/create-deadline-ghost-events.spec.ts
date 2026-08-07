import { createDeadlineGhostEvents } from './create-deadline-ghost-events';
import { SVEType } from '../schedule.const';
import { TaskCopy } from '../../tasks/task.model';

const DAYS = [
  '2026-08-01',
  '2026-08-02',
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
];

const baseTask = (overrides: Partial<TaskCopy>): TaskCopy =>
  ({
    id: 'task1',
    title: 'Test task',
    isDone: false,
    dueDay: null,
    dueWithTime: null,
    deadlineDay: null,
    deadlineWithTime: null,
    ...overrides,
  }) as TaskCopy;

describe('createDeadlineGhostEvents()', () => {
  it('creates ghost events for every day strictly between planned and deadline', () => {
    const task = baseTask({ dueDay: '2026-08-01', deadlineDay: '2026-08-09' });
    const result = createDeadlineGhostEvents([task], DAYS, 0);

    expect(result.map((ev) => ev.plannedForDay)).toEqual([
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
    ]);
    expect(result.every((ev) => ev.type === SVEType.DeadlineGhost)).toBe(true);
    expect(result.every((ev) => ev.data === task)).toBe(true);
  });

  it('excludes the planned day and the deadline day themselves', () => {
    const task = baseTask({ dueDay: '2026-08-01', deadlineDay: '2026-08-09' });
    const result = createDeadlineGhostEvents([task], DAYS, 0);

    expect(result.some((ev) => ev.plannedForDay === '2026-08-01')).toBe(false);
    expect(result.some((ev) => ev.plannedForDay === '2026-08-09')).toBe(false);
  });

  it('excludes done tasks', () => {
    const task = baseTask({
      isDone: true,
      dueDay: '2026-08-01',
      deadlineDay: '2026-08-09',
    });
    expect(createDeadlineGhostEvents([task], DAYS, 0)).toEqual([]);
  });

  it('excludes tasks missing a planned date', () => {
    const task = baseTask({ deadlineDay: '2026-08-09' });
    expect(createDeadlineGhostEvents([task], DAYS, 0)).toEqual([]);
  });

  it('excludes tasks missing a deadline', () => {
    const task = baseTask({ dueDay: '2026-08-01' });
    expect(createDeadlineGhostEvents([task], DAYS, 0)).toEqual([]);
  });

  it('excludes tasks whose deadline is on or before the planned day', () => {
    const sameDay = baseTask({ dueDay: '2026-08-05', deadlineDay: '2026-08-05' });
    const reversed = baseTask({ dueDay: '2026-08-05', deadlineDay: '2026-08-01' });
    expect(createDeadlineGhostEvents([sameDay], DAYS, 0)).toEqual([]);
    expect(createDeadlineGhostEvents([reversed], DAYS, 0)).toEqual([]);
  });

  it('prefers dueWithTime/deadlineWithTime over the day-only fields and applies the day offset', () => {
    const startOfNextDayDiffMs = 4 * 60 * 60 * 1000; // 4h logical-day offset
    const task = baseTask({
      // 02:00 minus a 4h offset lands on the previous logical day (08-01).
      dueWithTime: new Date('2026-08-02T02:00:00').getTime(),
      dueDay: '2026-08-05', // must be ignored in favor of dueWithTime
      // 02:00 minus a 4h offset lands on the previous logical day (08-08).
      deadlineWithTime: new Date('2026-08-09T02:00:00').getTime(),
      deadlineDay: '2026-08-01', // must be ignored in favor of deadlineWithTime
    });
    const result = createDeadlineGhostEvents([task], DAYS, startOfNextDayDiffMs);

    expect(result.map((ev) => ev.plannedForDay)).toEqual([
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ]);
  });

  it('only produces ghosts for days within the provided daysToShow window', () => {
    const task = baseTask({ dueDay: '2026-08-01', deadlineDay: '2026-08-09' });
    const narrowWindow = ['2026-08-03', '2026-08-04'];
    const result = createDeadlineGhostEvents([task], narrowWindow, 0);

    expect(result.map((ev) => ev.plannedForDay)).toEqual(['2026-08-03', '2026-08-04']);
  });
});
