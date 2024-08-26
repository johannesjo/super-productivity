import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { TaskCopy, TaskWithoutReminder } from '../../tasks/task.model';
import { createScheduleViewEntriesForNormalTasks } from './create-schedule-view-entries-for-normal-tasks';

const FID = 'FAKE_TASK_ID';
const FAKE_TASK: TaskCopy = {
  id: FID,
  subTaskIds: [],
  timeSpent: 0,
  timeEstimate: 0,
  plannedAt: null,
  reminderId: null,
} as any;
const minutes = (n: number): number => n * 60 * 1000;
const hours = (n: number): number => 60 * minutes(n);

describe('createScheduleViewEntriesForNormalTasks()', () => {
  it('should work', () => {
    const now = getDateTimeFromClockString('9:20', 0);
    const fakeTasks = [
      { ...FAKE_TASK, timeEstimate: hours(1) },
      { ...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(0.5) },
      { ...FAKE_TASK },
      { ...FAKE_TASK, timeEstimate: hours(1.5), timeSpent: hours(0.25) },
      { ...FAKE_TASK },
    ] as TaskWithoutReminder[];
    const r = createScheduleViewEntriesForNormalTasks(now, fakeTasks);
    expect(r).toEqual([
      {
        data: {
          id: 'FAKE_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 3600000,
          timeSpent: 0,
        },
        id: 'FAKE_TASK_ID',
        start: 30000000,
        type: 'Task',
        duration: 3600000,
      },
      {
        data: {
          id: 'FAKE_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 3600000,
          timeSpent: 1800000,
        },
        id: 'FAKE_TASK_ID',
        start: 33600000,
        type: 'Task',
        duration: 1800000,
      },
      {
        data: {
          id: 'FAKE_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 0,
          timeSpent: 0,
        },
        id: 'FAKE_TASK_ID',
        type: 'Task',
        start: 35400000,
        duration: 0,
      },
      {
        data: {
          id: 'FAKE_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 5400000,
          timeSpent: 900000,
        },
        id: 'FAKE_TASK_ID',
        type: 'Task',
        start: 35400000,
        duration: 4500000,
      },
      {
        data: {
          id: 'FAKE_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 0,
          timeSpent: 0,
        },
        id: 'FAKE_TASK_ID',
        type: 'Task',
        start: 39900000,
        duration: 0,
      },
    ] as any);
  });

  it('should work for non ordered scheduled tasks', () => {
    const now = getDateTimeFromClockString('9:30', 0);
    const fakeTasks = [
      { ...FAKE_TASK, timeEstimate: hours(1), id: 'OTHER_TASK_ID' },
    ] as TaskWithoutReminder[];
    const r = createScheduleViewEntriesForNormalTasks(now, fakeTasks);
    expect(r).toEqual([
      {
        data: {
          id: 'OTHER_TASK_ID',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: hours(1),
          timeSpent: 0,
        },
        duration: hours(1),
        id: 'OTHER_TASK_ID',

        start: now,
        type: 'Task',
      },
    ] as any);
  });

  it('should not mess up when there is a scheduled task in between tasks', () => {
    const now = getDateTimeFromClockString('9:30', 0);

    const fakeTasks = [
      { ...FAKE_TASK, timeEstimate: hours(1), id: 'T1' },
      { ...FAKE_TASK, timeEstimate: hours(2), id: 'T2' },
    ] as TaskWithoutReminder[];
    const r = createScheduleViewEntriesForNormalTasks(now, fakeTasks);
    expect(r).toEqual([
      {
        data: {
          id: 'T1',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 3600000,
          timeSpent: 0,
        },
        duration: 3600000,
        id: 'T1',
        start: now,
        type: 'Task',
      },
      {
        data: {
          id: 'T2',
          subTaskIds: [],
          plannedAt: null,
          reminderId: null,
          timeEstimate: 7200000,
          timeSpent: 0,
        },
        duration: 7200000,
        id: 'T2',
        start: now + hours(1),
        type: 'Task',
      },
    ] as any);
  });
});
