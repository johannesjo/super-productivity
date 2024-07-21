import { clearEntries, mapToTimelineViewEntries } from './map-to-timeline-view-entries';
import { TaskCopy, TaskReminderOptionId } from '../../tasks/task.model';
import { TimelineViewEntryType } from '../timeline.const';
import { TimelineViewEntry } from '../timeline.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { getWorklogStr } from '../../../util/get-work-log-str';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
} from '../../task-repeat-cfg/task-repeat-cfg.model';

const FID = 'FAKE_TASK_ID';
const FAKE_TASK: TaskCopy = {
  id: FID,
  timeSpent: 0,
  timeEstimate: 0,
  plannedAt: null,
  reminderId: null,
} as any;
const minutes = (n: number): number => n * 60 * 1000;
const hours = (n: number): number => 60 * minutes(n);
const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  ...DEFAULT_TASK_REPEAT_CFG,
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  quickSetting: 'DAILY',
  lastTaskCreation: 60 * 60 * 1000,
  defaultEstimate: undefined,
  projectId: null,
  startTime: undefined,
  remindAt: undefined,
  isPaused: false,
  repeatCycle: 'WEEKLY',
  startDate: getWorklogStr(new Date(0)),
  repeatEvery: 1,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  tagIds: [],
  order: 0,
};

const generateTimelineViewEntry = (
  day: number,
  startTime: string,
  endTime: string,
  type: TimelineViewEntryType,
): TimelineViewEntry => {
  if (type === TimelineViewEntryType.WorkdayStart) {
    return {
      id: 'WorkdayStart_' + day,
      type,
      start: getDateTimeFromClockString(startTime, day * 24 * 60 * 60 * 1000),
      data: { endTime, startTime },
    };
  } else if (type === TimelineViewEntryType.WorkdayEnd) {
    return {
      id: 'WorkdayEnd_' + day,
      type,
      start: getDateTimeFromClockString(endTime, day * 24 * 60 * 60 * 1000),
      data: { endTime, startTime },
    };
  } else if (type === TimelineViewEntryType.LunchBreak) {
    return {
      id: 'LunchBreak_' + day,
      type,
      start: getDateTimeFromClockString(startTime, day * 24 * 60 * 60 * 1000),
      data: { endTime, startTime },
    };
  } else if (type === TimelineViewEntryType.Task) {
    return {
      id: 'TASK_ID',
      type,
      start: getDateTimeFromClockString(startTime, day * 24 * 60 * 60 * 1000),
      data: { ...FAKE_TASK },
    };
  } else {
    throw 'generateWorkday: Unexpected type specified';
  }
};

describe('mapToViewEntries()', () => {
  describe('basic', () => {
    it('should work for simple task list', () => {
      const now = 33;
      const nonScheduledTasks = [{ ...FAKE_TASK, timeEstimate: 5000 }, { ...FAKE_TASK }];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        [],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: nonScheduledTasks[0].id,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
        },
        {
          id: nonScheduledTasks[1].id,
          type: TimelineViewEntryType.Task,
          start: 5033,
          data: nonScheduledTasks[1],
        },
      ]);
    });

    it('should work for simple task list 2', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: hours(1) },
        { ...FAKE_TASK, timeEstimate: hours(1) },
        { ...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(0.5) },
        { ...FAKE_TASK },
        { ...FAKE_TASK, timeEstimate: hours(1.5), timeSpent: hours(0.25) },
        { ...FAKE_TASK },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        [],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(1),
          data: nonScheduledTasks[1],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2),
          data: nonScheduledTasks[2],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[3],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[4],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(3.75),
          data: nonScheduledTasks[5],
        },
      ]);
    });

    it('should work for simple task list 3', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: 5000 },
        { ...FAKE_TASK, timeEstimate: 8000 },
        { ...FAKE_TASK, timeEstimate: 5000, timeSpent: 5000 },
        { ...FAKE_TASK },
        { ...FAKE_TASK, timeEstimate: 3000, timeSpent: 1000 },
        { ...FAKE_TASK },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        [],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 5000,
          data: nonScheduledTasks[1],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[2],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[3],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[4],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 15000,
          data: nonScheduledTasks[5],
        },
      ]);
    });

    it('should work for simple task list 4', () => {
      // const now = getDateTimeFromClockString('7:23', 0);
      const now = 1619983090852;
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeSpent: 21014, timeEstimate: 900000 },
        { ...FAKE_TASK, timeEstimate: 1800000, timeSpent: 148998 },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        [],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: 1619983969838,
          data: nonScheduledTasks[1],
        },
      ]);
    });
  });

  // describe('sortingEntries', () => {
  // it('should sort entries according to map if they have the same time', () => {});
  // });

  describe('scheduledTasks', () => {
    it('should work for just a scheduled task', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const scheduledTasks = [
        {
          ...FAKE_TASK,
          id: 'S_ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: getDateTimeFromClockString('10:25', 0),
        },
      ];
      const r = mapToTimelineViewEntries(
        [],
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toBe(1);
    });

    it('should work for scheduled sub tasks', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const scheduledTasks = [
        {
          ...FAKE_TASK,
          id: 'S_ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          parentId: 'SOME_PARENT_ID',
          plannedAt: getDateTimeFromClockString('10:25', 0),
        },
      ];
      const r = mapToTimelineViewEntries(
        [],
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toBe(1);
    });

    it('should filter out scheduled tasks from normal tasks', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: hours(1) },
        {
          ...FAKE_TASK,
          id: 'S_ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: getDateTimeFromClockString('10:25', 0),
        },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        [],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toBe(1);
    });

    it('should split tasks as required', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const plannedTaskStartTime = getDateTimeFromClockString('10:25', 0);
      const scheduledTasks = [
        {
          ...FAKE_TASK,
          id: 'S_ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime,
        },
      ];
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: hours(1) },
        { ...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(0.5) },
        { ...FAKE_TASK },
        { ...FAKE_TASK, timeEstimate: hours(1.5), timeSpent: hours(0.25) },
        { ...FAKE_TASK },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
        },
        {
          id: FID,
          type: TimelineViewEntryType.SplitTask,
          start: now + hours(1),
          data: nonScheduledTasks[1],
        },
        {
          id: 'S_ID',
          type: TimelineViewEntryType.ScheduledTask,
          start: plannedTaskStartTime,
          data: scheduledTasks[0],
        },
        {
          data: {
            timeToGo: minutes(25),
            title: undefined,
            taskId: 'FAKE_TASK_ID',
            index: 0,
          } as any,
          id: 'FAKE_TASK_ID__0',

          start: 37500000,
          type: TimelineViewEntryType.SplitTaskContinuedLast,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[2],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[3],
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(3.75),
          data: nonScheduledTasks[4],
        },
      ]);
    });

    it('should work for non ordered scheduled tasks', () => {
      const now = getDateTimeFromClockString('9:30', 0);
      const plannedTaskStartTime = getDateTimeFromClockString('12:26', 0);

      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: hours(1), id: 'OTHER_TASK_ID' },
      ];
      const scheduledTasks = [
        {
          ...FAKE_TASK,
          id: 'ScheduledTask:ID',
          timeEstimate: hours(0.5),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime,
        },
      ];

      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );

      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'OTHER_TASK_ID') as any,
      });
      expect(r[1]).toEqual({
        id: 'ScheduledTask:ID',
        type: TimelineViewEntryType.ScheduledTask,
        start: plannedTaskStartTime,
        data: scheduledTasks.find((t) => t.id === 'ScheduledTask:ID') as any,
      });
    });

    it('should work for scheduled task after a single normal task', () => {});

    it('should work for far away planned tasks', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const plannedTaskStartTime = getDateTimeFromClockString(
        '12:25',
        25 * 60 * 60 * 1000,
      );
      const scheduledTasks = [
        {
          ...FAKE_TASK,
          id: 'ScheduledTask:ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime,
        },
      ];
      const nonScheduledTasks = [
        { ...FAKE_TASK, timeEstimate: hours(1), id: 'OTHER_TASK_ID' },
        { ...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(0.5) },
        { ...FAKE_TASK },
      ];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'OTHER_TASK_ID') as any,
      });
    });

    it('should work for sophisticated scenarios', () => {
      const now = getDateTimeFromClockString('11:00', 0);
      const scheduledTasks = [
        {
          id: 'S4_NO_DURATION',
          timeSpent: 0,
          timeEstimate: 0,
          title: 'Scheduled 4 (no duration) 16:00',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('16:00', 0),
        },
        {
          id: 'S_NO_OVERLAP',
          timeSpent: 0,
          timeEstimate: hours(1),
          title: 'Scheduled 5 no overlap 23:00',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('23:00', 0),
        },
        {
          id: 'S3',
          timeSpent: 0,
          timeEstimate: hours(2),
          title: 'Scheduled 3 17:00',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('17:00', 0),
        },
        {
          id: 'S1',
          timeSpent: 0,
          timeEstimate: hours(1),
          title: 'Scheduled 1 15:00',
          reminderId: 'xxx',
          plannedAt: 1620046800000,
        },
        {
          id: 'S2',
          timeSpent: 0,
          timeEstimate: hours(2.5),
          title: 'Scheduled 2 15:30',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('15:30', 0),
        },
      ] as any;
      const nonScheduledTasks: TaskCopy[] = [
        {
          id: 'SOME_TASK_1_ID',
          timeSpent: 0,
          timeEstimate: hours(4),
          title: 'Some task 1',
          reminderId: null,
          plannedAt: null,
        },
        {
          id: 'SOME_TASK_2_ID',
          timeSpent: 0,
          timeEstimate: hours(3),
          title: 'Some task 2',
          reminderId: null,
          plannedAt: null,
        },
      ] as any;
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r[0]).toEqual({
        id: 'SOME_TASK_1_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'SOME_TASK_1_ID') as any,
      });
      expect(r[1]).toEqual({
        id: 'SOME_TASK_2_ID',
        type: TimelineViewEntryType.SplitTask,
        start: now + hours(4),
        data: nonScheduledTasks.find((t) => t.id === 'SOME_TASK_2_ID') as any,
      });
      expect(r[4].type).toEqual(TimelineViewEntryType.ScheduledTask);
    });

    it('should work for super sophisticated scenarios', () => {
      const now = 1620125839764;
      const scheduledTasks = [
        {
          id: 'X6NWaoxQ-',
          timeSpent: 0,
          timeEstimate: 1980000,
          title: 'Scheduled before now',
          reminderId: 'oejJdRc3Y',
          plannedAt: 1620125601000,
        },
        {
          id: '2nkBPQEny',
          timeSpent: 0,
          timeEstimate: 0,
          title: 'Sched no overlap 23:00',
          reminderId: 'K-1LvnNU5',
          plannedAt: 1620162000000,
        },
        {
          id: '0LtuSnH8s',
          timeSpent: 0,
          timeEstimate: 7200000,
          title: 'Scheduled 3 17:00',
          reminderId: 'NnqlBieeB',
          plannedAt: 1620140400000,
        },
        {
          id: '68K0kYJ2s',
          timeSpent: 0,
          timeEstimate: 7200000,
          title: 'Scheduled 1 15:00',
          reminderId: 'SrgAGy8OX',
          plannedAt: 1620133200000,
        },
        {
          id: '9JTnZa-VW',
          timeSpent: 0,
          timeEstimate: 9000000,
          title: 'Scheduled 2 16:00',
          reminderId: 'avWZ5dKrW',
          plannedAt: 1620136800000,
        },
        {
          id: 'EYLy6C5_m',
          timeSpent: 0,
          timeEstimate: 0,
          title: 'Scheduled 4 (no duration) 18:00',
          reminderId: 'BNaRpF_SX',
          plannedAt: 1620144000000,
        },
      ] as any;
      const nonScheduledTasks: TaskCopy[] = [
        {
          id: 'uDGzrv9JO',
          timeSpent: 0,
          timeEstimate: 3600000,
          title: 'Some task 1',
          reminderId: null,
          plannedAt: null,
        },
        {
          id: 'mhsGdyzc_',
          timeSpent: 0,
          timeEstimate: 7200000,
          title: 'Some task 2',
          reminderId: null,
          plannedAt: null,
        },
        {
          id: 'xgYNyslWC',
          timeSpent: 0,
          timeEstimate: 7200000,
          title: 'Sched  no overlap 9:00 (10.)',
          reminderId: null,
          plannedAt: null,
        },
      ] as any;
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          data: {
            id: 'X6NWaoxQ-',
            plannedAt: 1620125601000,
            reminderId: 'oejJdRc3Y',
            timeEstimate: 1980000,
            timeSpent: 0,
            title: 'Scheduled before now',
          },
          id: 'X6NWaoxQ-',

          start: 1620125601000,
          type: 'ScheduledTask',
        },
        {
          data: {
            id: 'uDGzrv9JO',
            plannedAt: null,
            reminderId: null,
            timeEstimate: 3600000,
            timeSpent: 0,
            title: 'Some task 1',
          },
          id: 'uDGzrv9JO',

          start: 1620127581000,
          type: 'Task',
        },
        {
          data: {
            id: 'mhsGdyzc_',
            plannedAt: null,
            reminderId: null,
            timeEstimate: 7200000,
            timeSpent: 0,
            title: 'Some task 2',
          },
          id: 'mhsGdyzc_',

          start: 1620131181000,
          type: 'SplitTask',
        },
        {
          data: {
            id: '68K0kYJ2s',
            plannedAt: 1620133200000,
            reminderId: 'SrgAGy8OX',
            timeEstimate: 7200000,
            timeSpent: 0,
            title: 'Scheduled 1 15:00',
          },
          id: '68K0kYJ2s',

          start: 1620133200000,
          type: 'ScheduledTask',
        },
        {
          data: {
            id: '9JTnZa-VW',
            plannedAt: 1620136800000,
            reminderId: 'avWZ5dKrW',
            timeEstimate: 9000000,
            timeSpent: 0,
            title: 'Scheduled 2 16:00',
          },
          id: '9JTnZa-VW',

          start: 1620136800000,
          type: 'ScheduledTask',
        },
        {
          data: {
            id: '0LtuSnH8s',
            plannedAt: 1620140400000,
            reminderId: 'NnqlBieeB',
            timeEstimate: 7200000,
            timeSpent: 0,
            title: 'Scheduled 3 17:00',
          },
          id: '0LtuSnH8s',

          start: 1620140400000,
          type: 'ScheduledTask',
        },
        {
          data: {
            id: 'EYLy6C5_m',
            plannedAt: 1620144000000,
            reminderId: 'BNaRpF_SX',
            timeEstimate: 0,
            timeSpent: 0,
            title: 'Scheduled 4 (no duration) 18:00',
          },
          id: 'EYLy6C5_m',

          start: 1620144000000,
          type: 'ScheduledTask',
        },
        {
          data: {
            index: 0,
            taskId: 'mhsGdyzc_',
            timeToGo: 5181000,
            title: 'Some task 2',
          },
          id: 'mhsGdyzc___0',

          start: 1620147600000,
          type: 'SplitTaskContinuedLast',
        },
        {
          data: {
            id: 'xgYNyslWC',
            plannedAt: null,
            reminderId: null,
            timeEstimate: 7200000,
            timeSpent: 0,
            title: 'Sched  no overlap 9:00 (10.)',
          },
          id: 'xgYNyslWC',

          start: 1620152781000,
          type: 'Task',
        },
        {
          data: {
            id: '2nkBPQEny',
            plannedAt: 1620162000000,
            reminderId: 'K-1LvnNU5',
            timeEstimate: 0,
            timeSpent: 0,
            title: 'Sched no overlap 23:00',
          },
          id: '2nkBPQEny',

          start: 1620162000000,
          type: 'ScheduledTask',
        },
      ] as any);
    });
  });

  describe('splitTasks', () => {
    it('should work for a simple task', () => {
      const now = getDateTimeFromClockString('9:00', 0);
      const normalTask = { ...FAKE_TASK, timeEstimate: hours(3) };
      const scheduledTask = {
        ...FAKE_TASK,
        timeEstimate: hours(1),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('10:00', 0),
      };
      const r = mapToTimelineViewEntries(
        [normalTask],
        [scheduledTask],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toEqual(3);
      expect(r).toEqual([
        {
          id: normalTask.id,
          type: TimelineViewEntryType.SplitTask,
          start: now,
          data: normalTask,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
        },
        {
          id: normalTask.id + '__0',
          type: TimelineViewEntryType.SplitTaskContinuedLast,
          start: now + hours(2),
          data: {
            taskId: normalTask.id,
            title: normalTask.title,
            timeToGo: hours(2),
            index: 0,
          },
        },
      ]);
    });

    it('should split multiple times', () => {
      const now = getDateTimeFromClockString('9:00', 0);
      const normalTask = { ...FAKE_TASK, timeEstimate: hours(3) };
      const scheduledTask = {
        ...FAKE_TASK,
        timeEstimate: hours(1),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('10:00', 0),
      };
      const scheduledTask2 = {
        ...FAKE_TASK,
        timeEstimate: hours(1),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('12:00', 0),
      };
      const nonScheduledTasks = [normalTask];
      const scheduledTasks = [scheduledTask, scheduledTask2];
      const r = mapToTimelineViewEntries(
        nonScheduledTasks,
        scheduledTasks,
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toEqual(5);
      expect(r).toEqual([
        {
          id: normalTask.id,
          type: TimelineViewEntryType.SplitTask,
          start: now,
          data: normalTask,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
        },
        {
          id: normalTask.id + '__0',
          type: TimelineViewEntryType.SplitTaskContinued,
          start: getDateTimeFromClockString('11:00', 0),
          data: {
            title: normalTask.title,
            timeToGo: hours(1),
            taskId: normalTask.id,
            index: 0,
          },
        },
        {
          id: scheduledTask2.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask2.plannedAt,
          data: scheduledTask2,
        },
        {
          id: normalTask.id + '__1',
          type: TimelineViewEntryType.SplitTaskContinuedLast,
          start: getDateTimeFromClockString('13:00', 0),
          data: {
            title: normalTask.title,
            timeToGo: hours(1),
            taskId: normalTask.id,
            index: 1,
          },
        },
      ]);
    });

    it('should calculate the right time', () => {
      const now = getDateTimeFromClockString('18:00', 0);
      const normalTask = { ...FAKE_TASK, timeEstimate: hours(30) };
      const scheduledTask = {
        ...FAKE_TASK,
        timeEstimate: hours(1),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('19:00', 0),
      };
      const r = mapToTimelineViewEntries(
        [normalTask],
        [scheduledTask],
        [],
        [],
        null,
        undefined,
        undefined,
        now,
      );
      expect(r.length).toEqual(3);
      expect(r).toEqual([
        {
          id: normalTask.id,
          type: TimelineViewEntryType.SplitTask,
          start: now,
          data: normalTask,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
        },
        {
          id: normalTask.id + '__0',
          type: TimelineViewEntryType.SplitTaskContinuedLast,
          start: now + hours(2),
          data: {
            taskId: normalTask.id,
            title: normalTask.title,
            timeToGo: hours(29),
            index: 0,
          },
        },
      ]);
    });
  });

  describe('workStartEnd', () => {
    it('should work for very long tasks', () => {
      const now = getDateTimeFromClockString('9:00', 0);

      const longTask = { ...FAKE_TASK, id: 'LONG_ID', timeEstimate: hours(16) };

      const scheduledTask = {
        ...FAKE_TASK,
        id: 'S_ID',
        timeEstimate: hours(2),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('14:00', 0),
      };

      const r = mapToTimelineViewEntries(
        [longTask],
        [scheduledTask],
        [],
        [],
        null,
        { startTime: '9:00', endTime: '17:00' },
        undefined,
        now,
      );

      expect(r[0]).toEqual({
        type: TimelineViewEntryType.SplitTask,
        start: now,
        id: longTask.id,
        data: longTask,
      });
      expect(r[1]).toEqual({
        type: TimelineViewEntryType.ScheduledTask,
        start: scheduledTask.plannedAt,
        id: scheduledTask.id,
        data: scheduledTask,
      });
      expect(r[2]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: now + hours(7),
        id: longTask.id + '__0',

        data: {
          taskId: longTask.id,
          timeToGo: hours(1),
          index: 0,
          title: longTask.title,
        },
      });
      expect(r[3]).toEqual({
        type: TimelineViewEntryType.WorkdayEnd,
        start: getDateTimeFromClockString('17:00', 0),
        id: 'DAY_END_57600000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[5]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: 'DAY_START_115200000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[6]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: longTask.id + '__1',

        data: {
          index: 1,
          taskId: longTask.id,
          // timeToGo: hours(18),
          timeToGo: hours(8),
          title: longTask.title,
        },
      });
      expect(r[7]).toEqual({
        type: TimelineViewEntryType.WorkdayEnd,
        start: getDateTimeFromClockString('17:00', 24 * 60 * 60000),
        id: 'DAY_END_144000000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[9]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: 'DAY_START_201600000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[10]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinuedLast,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: longTask.id + '__2',

        data: {
          index: 2,
          taskId: longTask.id,
          // timeToGo: hours(18),
          timeToGo: hours(2),
          title: longTask.title,
        },
      });
    });

    it('should work for special case', () => {
      const d = {
        tasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(4),
            title: 'Split Task',
            reminderId: null,
            plannedAt: null,
          },
          {
            timeSpent: 0,
            timeEstimate: 0,
            title: 'Task at a wrong place',
            reminderId: null,
            plannedAt: null,
          },
        ],
        scheduledTasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(1),
            title: 'Scheduled Inside Block',
            reminderId: 'XXX',
            plannedAt: getDateTimeFromClockString('19:00', 0),
          },
          {
            timeSpent: 0,
            timeEstimate: minutes(10),
            title: 'Scheduled Split Trigger Before Day End',
            reminderId: 'XXX',
            plannedAt: getDateTimeFromClockString('16:00', 0),
          },
        ],
        workStartEndCfg: { startTime: '9:00', endTime: '17:00' },
        now: getDateTimeFromClockString('15:00', 0),
      } as any;
      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        [],
        [],
        null,
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      expect(r.length).toEqual(9);
      expect(r[0].type).toEqual(TimelineViewEntryType.SplitTask);
      expect(r[1].type).toEqual(TimelineViewEntryType.ScheduledTask);
      expect(r[2].type).toEqual(TimelineViewEntryType.SplitTaskContinued);
      expect(r[3].type).toEqual(TimelineViewEntryType.WorkdayEnd);
      expect(r[4].type).toEqual(TimelineViewEntryType.ScheduledTask);
      expect(r[5].type).toEqual(TimelineViewEntryType.DayCrossing);
      expect(r[6].type).toEqual(TimelineViewEntryType.WorkdayStart);
      expect(r[7].type).toEqual(TimelineViewEntryType.SplitTaskContinuedLast);
      expect(r[8].type).toEqual(TimelineViewEntryType.Task);
    });

    it('should work if a task scheduled for tomorrow is current task', () => {
      const d = {
        tasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(5),
            title: 'Task',
            reminderId: null,
            plannedAt: null,
          },
        ],
        scheduledTasks: [
          {
            id: 'SCHEDULED_CURRENT_ID',
            timeSpent: 0,
            timeEstimate: hours(0.5),
            title: 'Scheduled Tomorrow',
            reminderId: 'XXX',
            plannedAt: getDateTimeFromClockString('19:00', 24 * 60 * 60 * 1000),
          },
        ],
        workStartEndCfg: { startTime: '14:00', endTime: '20:00' },
        now: getDateTimeFromClockString('12:00', 0),
      } as any;
      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        [],
        [],
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.ScheduledTask);
      expect(r[1].type).toEqual(TimelineViewEntryType.Task);
      expect(r[1].start).toEqual(getDateTimeFromClockString('14:00', 0));
    });
  });

  describe('repeatTaskProjections', () => {
    it('should work if there are only projects but no tasks', () => {
      const d = {
        tasks: [],
        scheduledTasks: [],
        repeatTaskProjections: [
          {
            ...DUMMY_REPEATABLE_TASK,
            id: 'R1',
            title: 'Repeat 1 Daily',
            lastTaskCreation: 60000,
            defaultEstimate: hours(1),
            startTime: '10:00',
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true,
            remindAt: TaskReminderOptionId.AtStart,
            tagIds: [],
          },
        ] as TaskRepeatCfg[],
        workStartEndCfg: { startTime: '10:00', endTime: '20:00' },
        now: getDateTimeFromClockString('12:00', 0),
      } as any;
      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        d.repeatTaskProjections,
        [],
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.DayCrossing);
      expect(r[1].type).toEqual(TimelineViewEntryType.WorkdayStart);
      expect(r[2].type).toEqual(TimelineViewEntryType.ScheduledRepeatProjection);
      expect(r[3].type).toEqual(TimelineViewEntryType.WorkdayEnd);
      expect(r[4].type).toEqual(TimelineViewEntryType.DayCrossing);
      expect(r[5].type).toEqual(TimelineViewEntryType.WorkdayStart);
      expect(r[6].type).toEqual(TimelineViewEntryType.ScheduledRepeatProjection);
      expect(r[7].type).toEqual(TimelineViewEntryType.WorkdayEnd);
    });

    it('should work for repeat task projections', () => {
      const d = {
        tasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(5),
            title: 'Task',
            reminderId: null,
            plannedAt: null,
          },
        ],
        scheduledTasks: [],
        repeatTaskProjections: [
          {
            ...DUMMY_REPEATABLE_TASK,
            id: 'R1',
            title: 'Repeat 1 10:00',
            startTime: '10:00',
            lastTaskCreation: 60000,
            defaultEstimate: hours(1),
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: true,
            saturday: false,
            sunday: false,

            projectId: null,
            remindAt: TaskReminderOptionId.AtStart,
            isAddToBottom: true,
            tagIds: [],
          },
        ],
        workStartEndCfg: { startTime: '14:00', endTime: '20:00' },
        now: getDateTimeFromClockString('12:00', 0),
      } as any;
      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        d.repeatTaskProjections,
        [],
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.Task);
      // expect(r[1].type).toEqual(TimelineViewEntryType.WorkdayEnd);
      expect(r[2].type).toEqual(TimelineViewEntryType.DayCrossing);
      expect(r[3].type).toEqual(TimelineViewEntryType.ScheduledRepeatProjection);
      expect(r[4].type).toEqual(TimelineViewEntryType.DayCrossing);

      expect(r[3].start).toEqual(
        getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      );
    });
  });

  describe('lunchBreak', () => {
    it('should work with one single task', () => {
      const now = getDateTimeFromClockString('9:00', 0);
      const singleTask = { ...FAKE_TASK, id: 'TASK_ID', timeEstimate: hours(5) };
      const r = mapToTimelineViewEntries(
        [singleTask],
        [],
        [],
        [],
        null,
        { startTime: '9:00', endTime: '17:00' },
        { startTime: '13:00', endTime: '14:00' },
        now,
      );

      //expect(r.length).toEqual(3);

      expect(r[0]).toEqual({
        type: TimelineViewEntryType.SplitTask,
        start: getDateTimeFromClockString('09:00', 0),
        id: singleTask.id,

        data: singleTask,
      });

      expect(r[1]).toEqual({
        type: TimelineViewEntryType.LunchBreak,
        start: getDateTimeFromClockString('13:00', 0),
        id: 'LUNCH_BREAK_43200000',

        data: { endTime: '14:00', startTime: '13:00' },
      });

      expect(r[2]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinuedLast,
        start: getDateTimeFromClockString('14:00', 0),
        id: singleTask.id + '__0',

        data: {
          taskId: singleTask.id,
          timeToGo: hours(1),
          index: 0,
          title: singleTask.title,
        },
      });
    });

    it('should work for very long tasks', () => {
      const now = getDateTimeFromClockString('9:00', 0);

      const longTask = { ...FAKE_TASK, id: 'LONG_ID', timeEstimate: hours(16) };

      const scheduledTask = {
        ...FAKE_TASK,
        id: 'S_ID',
        timeEstimate: hours(2),
        reminderId: 'X',
        plannedAt: getDateTimeFromClockString('14:00', 0),
      };

      const r = mapToTimelineViewEntries(
        [longTask],
        [scheduledTask],
        [],
        [],
        null,
        { startTime: '9:00', endTime: '17:00' },
        { startTime: '13:00', endTime: '14:00' },
        now,
      );

      expect(r[0]).toEqual({
        type: TimelineViewEntryType.SplitTask,
        start: now,
        id: longTask.id,
        data: longTask,
      });
      expect(r[1]).toEqual({
        type: TimelineViewEntryType.LunchBreak,
        start: getDateTimeFromClockString('13:00', 0),
        id: 'LUNCH_BREAK_43200000',

        data: { endTime: '14:00', startTime: '13:00' },
      });
      expect(r[2]).toEqual({
        type: TimelineViewEntryType.ScheduledTask,
        start: scheduledTask.plannedAt,
        id: scheduledTask.id,
        data: scheduledTask,
      });
      expect(r[3]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: now + hours(7),
        id: longTask.id + '__0',

        data: {
          taskId: longTask.id,
          timeToGo: hours(1),
          index: 0,
          title: longTask.title,
        },
      });
      expect(r[4]).toEqual({
        type: TimelineViewEntryType.WorkdayEnd,
        start: getDateTimeFromClockString('17:00', 0),
        id: 'DAY_END_57600000',

        data: { endTime: '17:00', startTime: '9:00' },
      });

      // r[5] is a day crossing
      expect(r[6]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: 'DAY_START_115200000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[7]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: longTask.id + '__1',

        data: {
          index: 1,
          taskId: longTask.id,
          timeToGo: hours(4),
          title: longTask.title,
        },
      });
      expect(r[8]).toEqual({
        type: TimelineViewEntryType.LunchBreak,
        start: getDateTimeFromClockString('13:00', 24 * 60 * 60000),
        id: 'LUNCH_BREAK_129600000',

        data: { endTime: '14:00', startTime: '13:00' },
      });
      expect(r[9]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: getDateTimeFromClockString('14:00', 24 * 60 * 60000),
        id: longTask.id + '__2',

        data: {
          index: 2,
          taskId: longTask.id,
          timeToGo: hours(3),
          title: longTask.title,
        },
      });
      expect(r[10]).toEqual({
        type: TimelineViewEntryType.WorkdayEnd,
        start: getDateTimeFromClockString('17:00', 24 * 60 * 60000),
        id: 'DAY_END_144000000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[12]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: 'DAY_START_201600000',

        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[13]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinuedLast,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: longTask.id + '__3',

        data: {
          index: 3,
          taskId: longTask.id,
          timeToGo: hours(4),
          title: longTask.title,
        },
      });
    });
  });

  describe('calenderWithItems', () => {
    it('should work for calenderWithItems', () => {
      const d = {
        calendarWithItems: [
          {
            icon: 'testICON',
            items: [
              {
                start: getDateTimeFromClockString('13:00', 0),
                duration: hours(3),
              },
            ],
          },
        ],
        tasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(5),
            title: 'Task',
            reminderId: null,
            plannedAt: null,
          },
        ],
        scheduledTasks: [],
        repeatTaskProjections: [],
        workStartEndCfg: { startTime: '14:00', endTime: '20:00' },
        now: getDateTimeFromClockString('12:00', 0),
      } as any;

      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        d.repeatTaskProjections,
        d.calendarWithItems,
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      console.log(r);

      expect(r[0].type).toEqual(TimelineViewEntryType.CalendarEvent);
      expect(r[1].type).toEqual(TimelineViewEntryType.SplitTask);
      expect(r[2].type).toEqual(TimelineViewEntryType.WorkdayEnd);
      expect(r[3].type).toEqual(TimelineViewEntryType.DayCrossing);
      // expect(r[3].start).toEqual(
      //   getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      // );
    });

    it('should work for 0 duration calenderWithItems', () => {
      const d = {
        calendarWithItems: [
          {
            icon: 'testICON',
            items: [
              {
                start: getDateTimeFromClockString('15:00', 0),
                duration: 0,
              },
            ],
          },
        ],
        tasks: [
          {
            timeSpent: 0,
            timeEstimate: hours(5),
            title: 'Task',
            reminderId: null,
            plannedAt: null,
          },
        ],
        scheduledTasks: [],
        repeatTaskProjections: [],
        workStartEndCfg: { startTime: '14:00', endTime: '20:00' },
        now: getDateTimeFromClockString('12:00', 0),
      } as any;

      const r = mapToTimelineViewEntries(
        d.tasks,
        d.scheduledTasks,
        d.repeatTaskProjections,
        d.calendarWithItems,
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        undefined,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.SplitTask);
      expect(r[1].type).toEqual(TimelineViewEntryType.CalendarEvent);
      expect(r[2].type).toEqual(TimelineViewEntryType.SplitTaskContinuedLast);
      expect(r.length).toBe(3);
      expect(r[2].start).toEqual(r[1].start);
    });
  });
});

describe('clearEntries', () => {
  it('should remove workdayEnd if it is the first element', () => {
    const entries: TimelineViewEntry[] = [
      generateTimelineViewEntry(0, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
    ];
    const result = clearEntries(entries, false);
    expect(result.length).toEqual(0);
  });

  it('should remove workdayEnd if it is the last element', () => {
    const entries: TimelineViewEntry[] = [
      generateTimelineViewEntry(0, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(0, '12:00', '13:00', TimelineViewEntryType.Task),
      generateTimelineViewEntry(0, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
    ];
    const result = clearEntries(entries, false);
    expect(result.length).toEqual(2);
    expect(result[0].type).toEqual(TimelineViewEntryType.WorkdayStart);
    expect(result[1].type).toEqual(TimelineViewEntryType.Task);
  });

  it('should remove empty days (at the end) containing only lunchBreaks and workdays', () => {
    const entries: TimelineViewEntry[] = [
      generateTimelineViewEntry(0, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(0, '12:00', '13:00', TimelineViewEntryType.Task),
      generateTimelineViewEntry(0, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(0, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
      generateTimelineViewEntry(1, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(1, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(1, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
    ];
    const result = clearEntries(entries, true);
    expect(result.length).toEqual(2);
    expect(result[0].type).toEqual(TimelineViewEntryType.WorkdayStart);
    expect(result[1].type).toEqual(TimelineViewEntryType.Task);
  });

  it('should remove empty days (in the middle) containing only lunchBreaks and workdays', () => {
    const entries: TimelineViewEntry[] = [
      generateTimelineViewEntry(0, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(0, '12:00', '13:00', TimelineViewEntryType.Task),
      generateTimelineViewEntry(0, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(0, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
      generateTimelineViewEntry(1, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(1, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(1, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
      generateTimelineViewEntry(2, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(2, '12:00', '13:00', TimelineViewEntryType.Task),
      generateTimelineViewEntry(2, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(2, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
    ];
    const result = clearEntries(entries, true);
    expect(result.length).toEqual(6);
    expect(result[0].type).toEqual(TimelineViewEntryType.WorkdayStart);
    expect(result[1].type).toEqual(TimelineViewEntryType.Task);
    expect(result[2].type).toEqual(TimelineViewEntryType.LunchBreak);
    expect(result[3].type).toEqual(TimelineViewEntryType.WorkdayEnd);
    expect(result[4].type).toEqual(TimelineViewEntryType.WorkdayStart);
    expect(result[5].type).toEqual(TimelineViewEntryType.Task);
  });

  it('should remove initial LunchBreak and WorkdayEnd', () => {
    const entries: TimelineViewEntry[] = [
      generateTimelineViewEntry(0, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(0, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
      generateTimelineViewEntry(1, '9:00', '17:00', TimelineViewEntryType.WorkdayStart),
      generateTimelineViewEntry(1, '12:00', '13:00', TimelineViewEntryType.Task),
      generateTimelineViewEntry(1, '13:00', '14:00', TimelineViewEntryType.LunchBreak),
      generateTimelineViewEntry(1, '17:00', '9:00', TimelineViewEntryType.WorkdayEnd),
    ];
    const result = clearEntries(entries, true);
    expect(result.length).toEqual(2);
    expect(result[0].type).toEqual(TimelineViewEntryType.WorkdayStart);
    expect(result[1].type).toEqual(TimelineViewEntryType.Task);
  });
});
