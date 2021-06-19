import { mapToTimelineViewEntries } from './map-to-timeline-view-entries';
import { TaskCopy, TaskReminderOptionId } from '../../tasks/task.model';
import { TimelineViewEntryType } from '../timeline.const';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

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

describe('mapToViewEntries()', () => {
  describe('basic', () => {
    it('should work for simple task list', () => {
      const now = 33;
      const nonScheduledTasks = [{ ...FAKE_TASK, timeEstimate: 5000 }, { ...FAKE_TASK }];
      const r = mapToTimelineViewEntries(nonScheduledTasks, [], [], null, undefined, now);
      expect(r).toEqual([
        {
          id: nonScheduledTasks[0].id,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
          isHideTime: false,
        },
        {
          id: nonScheduledTasks[1].id,
          type: TimelineViewEntryType.Task,
          start: 5033,
          data: nonScheduledTasks[1],
          isHideTime: false,
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
      const r = mapToTimelineViewEntries(nonScheduledTasks, [], [], null, undefined, now);
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(1),
          data: nonScheduledTasks[1],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2),
          data: nonScheduledTasks[2],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[3],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[4],
          isHideTime: true,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(3.75),
          data: nonScheduledTasks[5],
          isHideTime: false,
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
      const r = mapToTimelineViewEntries(nonScheduledTasks, [], [], null, undefined, now);
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 5000,
          data: nonScheduledTasks[1],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[2],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[3],
          isHideTime: true,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 13000,
          data: nonScheduledTasks[4],
          isHideTime: true,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + 15000,
          data: nonScheduledTasks[5],
          isHideTime: false,
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
      const r = mapToTimelineViewEntries(nonScheduledTasks, [], [], null, undefined, now);
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: 1619983969838,
          data: nonScheduledTasks[1],
          isHideTime: false,
        },
      ]);
    });
  });

  describe('sortingEntries', () => {
    // it('should sort entries according to map if they have the same time', () => {});
  });

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
      const r = mapToTimelineViewEntries([], scheduledTasks, [], null, undefined, now);
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
      const r = mapToTimelineViewEntries([], scheduledTasks, [], null, undefined, now);
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
      const r = mapToTimelineViewEntries(nonScheduledTasks, [], [], null, undefined, now);
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
        null,
        undefined,
        now,
      );
      expect(r).toEqual([
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now,
          data: nonScheduledTasks[0],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.SplitTask,
          start: now + hours(1),
          data: nonScheduledTasks[1],
          isHideTime: false,
        },
        {
          id: 'S_ID',
          type: TimelineViewEntryType.ScheduledTask,
          start: plannedTaskStartTime,
          data: scheduledTasks[0],
          isHideTime: false,
        },
        {
          data: {
            timeToGo: minutes(25),
            title: undefined,
            taskId: 'FAKE_TASK_ID',
            index: 0,
          } as any,
          id: 'FAKE_TASK_ID__0',
          isHideTime: false,
          start: 37500000,
          type: TimelineViewEntryType.SplitTaskContinuedLast,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[2],
          isHideTime: false,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(2.5),
          data: nonScheduledTasks[3],
          isHideTime: true,
        },
        {
          id: FID,
          type: TimelineViewEntryType.Task,
          start: now + hours(3.75),
          data: nonScheduledTasks[4],
          isHideTime: false,
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
        null,
        undefined,
        now,
      );

      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'OTHER_TASK_ID') as any,
        isHideTime: false,
      });
      expect(r[1]).toEqual({
        id: 'ScheduledTask:ID',
        type: TimelineViewEntryType.ScheduledTask,
        start: plannedTaskStartTime,
        data: scheduledTasks.find((t) => t.id === 'ScheduledTask:ID') as any,
        isHideTime: false,
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
        null,
        undefined,
        now,
      );
      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'OTHER_TASK_ID') as any,
        isHideTime: false,
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
        null,
        undefined,
        now,
      );
      expect(r[0]).toEqual({
        id: 'SOME_TASK_1_ID',
        type: TimelineViewEntryType.Task,
        start: now,
        data: nonScheduledTasks.find((t) => t.id === 'SOME_TASK_1_ID') as any,
        isHideTime: false,
      });
      expect(r[1]).toEqual({
        id: 'SOME_TASK_2_ID',
        type: TimelineViewEntryType.SplitTask,
        start: now + hours(4),
        data: nonScheduledTasks.find((t) => t.id === 'SOME_TASK_2_ID') as any,
        isHideTime: false,
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
        null,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
          isHideTime: false,
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
        null,
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
          isHideTime: false,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
          isHideTime: false,
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
          isHideTime: false,
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
        null,
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
          isHideTime: false,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
          isHideTime: false,
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
          isHideTime: false,
        },
        {
          id: scheduledTask2.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask2.plannedAt,
          data: scheduledTask2,
          isHideTime: false,
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
          isHideTime: false,
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
        null,
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
          isHideTime: false,
        },
        {
          id: scheduledTask.id,
          type: TimelineViewEntryType.ScheduledTask,
          start: scheduledTask.plannedAt,
          data: scheduledTask,
          isHideTime: false,
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
          isHideTime: false,
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
        null,
        { startTime: '9:00', endTime: '17:00' },
        now,
      );

      expect(r[0]).toEqual({
        type: TimelineViewEntryType.SplitTask,
        start: now,
        id: longTask.id,
        data: longTask,
        isHideTime: false,
      });
      expect(r[1]).toEqual({
        type: TimelineViewEntryType.ScheduledTask,
        start: scheduledTask.plannedAt,
        id: scheduledTask.id,
        data: scheduledTask,
        isHideTime: false,
      });
      expect(r[2]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: now + hours(7),
        id: longTask.id + '__0',
        isHideTime: false,
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
        isHideTime: false,
        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[5]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: 'DAY_START_115200000',
        isHideTime: false,
        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[6]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinued,
        start: getDateTimeFromClockString('9:00', 24 * 60 * 60000),
        id: longTask.id + '__1',
        isHideTime: true,
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
        isHideTime: false,
        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[9]).toEqual({
        type: TimelineViewEntryType.WorkdayStart,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: 'DAY_START_201600000',
        isHideTime: false,
        data: { endTime: '17:00', startTime: '9:00' },
      });
      expect(r[10]).toEqual({
        type: TimelineViewEntryType.SplitTaskContinuedLast,
        start: getDateTimeFromClockString('9:00', 2 * 24 * 60 * 60000),
        id: longTask.id + '__2',
        isHideTime: true,
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
        null,
        d.workStartEndCfg,
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
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.ScheduledTask);
      expect(r[1].type).toEqual(TimelineViewEntryType.Task);
      expect(r[1].start).toEqual(getDateTimeFromClockString('14:00', 0));
    });
  });

  describe('repeatTaskProjections', () => {
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
            id: 'R1',
            title: 'Repeat 1 10:00',
            startTime: '10:00',
            lastTaskCreation: 0,
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
        'SCHEDULED_CURRENT_ID',
        d.workStartEndCfg,
        d.now,
      );

      expect(r[0].type).toEqual(TimelineViewEntryType.Task);
      expect(r[1].type).toEqual(TimelineViewEntryType.WorkdayEnd);
      expect(r[2].type).toEqual(TimelineViewEntryType.DayCrossing);
      expect(r[3].type).toEqual(TimelineViewEntryType.ScheduledRepeatTaskProjection);
      expect(r[4].type).toEqual(TimelineViewEntryType.DayCrossing);

      expect(r[3].start).toEqual(
        getDateTimeFromClockString('10:00', 24 * 60 * 60 * 1000),
      );
    });
  });
});
