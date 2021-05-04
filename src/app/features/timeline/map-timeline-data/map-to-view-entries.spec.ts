import { mapToViewEntries } from './map-to-view-entries';
import { TaskCopy } from '../../tasks/task.model';
import { TimelineViewEntryType } from '../timeline.model';
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
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: 5000},
        {...FAKE_TASK},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        id: fakeTasks[0].id,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: fakeTasks[1].id,
        type: TimelineViewEntryType.Task,
        time: 5033,
        data: fakeTasks[1],
        isHideTime: false,
      }]);
    });

    it('should work for simple task list 2', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: hours(1)},
        {...FAKE_TASK, timeEstimate: hours(1)},
        {...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(.5)},
        {...FAKE_TASK},
        {...FAKE_TASK, timeEstimate: hours(1.5), timeSpent: hours(.25)},
        {...FAKE_TASK},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(1),
        data: fakeTasks[1],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(2),
        data: fakeTasks[2],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(2.5),
        data: fakeTasks[3],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(2.5),
        data: fakeTasks[4],
        isHideTime: true,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(3.75),
        data: fakeTasks[5],
        isHideTime: false,
      }]);
    });

    it('should work for simple task list 3', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: 5000},
        {...FAKE_TASK, timeEstimate: 8000},
        {...FAKE_TASK, timeEstimate: 5000, timeSpent: 5000},
        {...FAKE_TASK},
        {...FAKE_TASK, timeEstimate: 3000, timeSpent: 1000},
        {...FAKE_TASK},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + 5000,
        data: fakeTasks[1],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + 13000,
        data: fakeTasks[2],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + 13000,
        data: fakeTasks[3],
        isHideTime: true,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + 13000,
        data: fakeTasks[4],
        isHideTime: true,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + 15000,
        data: fakeTasks[5],
        isHideTime: false,
      }]);
    });

    it('should work for simple task list 4', () => {
      // const now = getDateTimeFromClockString('7:23', 0);
      const now = 1619983090852;
      const fakeTasks = [
        {...FAKE_TASK, timeSpent: 21014, timeEstimate: 900000,},
        {...FAKE_TASK, timeEstimate: 1800000, timeSpent: 148998},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: 1619983969838,
        data: fakeTasks[1],
        isHideTime: false,
      }]);
    });
  });

  describe('scheduledTasks', () => {
    it('should split tasks as required', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const plannedTaskStartTime = getDateTimeFromClockString('10:25', 0);
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: hours(1)},
        {
          ...FAKE_TASK,
          id: 'S_ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime
        },
        {...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(.5)},
        {...FAKE_TASK},
        {...FAKE_TASK, timeEstimate: hours(1.5), timeSpent: hours(.25)},
        {...FAKE_TASK},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.SplitTask,
        time: now + hours(1),
        data: fakeTasks[2],
        isHideTime: false,
      }, {
        id: 'S_ID',
        type: TimelineViewEntryType.ScheduledTask,
        time: plannedTaskStartTime,
        data: fakeTasks[1],
        isHideTime: false,
      }, {
        data: {timeToGo: minutes(25), title: undefined} as any,
        id: '0_FAKE_TASK_ID',
        isHideTime: false,
        time: 37500000,
        type: TimelineViewEntryType.SplitTaskContinued
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(2.5),
        data: fakeTasks[3],
        isHideTime: false,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(2.5),
        data: fakeTasks[4],
        isHideTime: true,
      }, {
        id: FID,
        type: TimelineViewEntryType.Task,
        time: now + hours(3.75),
        data: fakeTasks[5],
        isHideTime: false,
      }]);
    });

    it('should work for non ordered scheduled tasks', () => {
      const now = getDateTimeFromClockString('9:30', 0);
      const plannedTaskStartTime = getDateTimeFromClockString('12:26', 0);

      const fakeTasks = [
        {
          ...FAKE_TASK,
          id: 'ScheduledTask:ID',
          timeEstimate: hours(0.5),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime
        },
        {...FAKE_TASK, timeEstimate: hours(1), id: 'OTHER_TASK_ID'},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);

      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks.find(t => t.id === 'OTHER_TASK_ID') as any,
        isHideTime: false,
      });
      expect(r[1]).toEqual({
        id: 'ScheduledTask:ID',
        type: TimelineViewEntryType.ScheduledTask,
        time: plannedTaskStartTime,
        data: fakeTasks.find(t => t.id === 'ScheduledTask:ID') as any,
        isHideTime: false,
      });
    });

    it('should work for scheduled task after a single normal task', () => {

    });

    it('should work for far away planned tasks', () => {
      const now = getDateTimeFromClockString('9:20', 0);
      const plannedTaskStartTime = getDateTimeFromClockString('12:25', 25 * 60 * 60 * 1000);
      const fakeTasks = [
        {
          ...FAKE_TASK,
          id: 'ScheduledTask:ID',
          timeEstimate: hours(1),
          reminderId: 'R:ID',
          plannedAt: plannedTaskStartTime
        },
        {...FAKE_TASK, timeEstimate: hours(1), id: 'OTHER_TASK_ID'},
        {...FAKE_TASK, timeEstimate: hours(1), timeSpent: hours(.5)},
        {...FAKE_TASK},
      ];
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r[0]).toEqual({
        id: 'OTHER_TASK_ID',
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks.find(t => t.id === 'OTHER_TASK_ID') as any,
        isHideTime: false,
      });
    });

    it('should work for sophisticated scenarios', () => {
      const now = getDateTimeFromClockString('11:00', 0);
      const fakeTasks: TaskCopy[] = [
        {
          id: 'S4_NO_DURATION',
          timeSpent: 0,
          timeEstimate: 0,
          title: 'Scheduled 4 (no duration) 16:00',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('16:00', 0),
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
          id: 'S_NO_OVERLAP',
          timeSpent: 0,
          timeEstimate: hours(1),
          title: 'Scheduled 5 no overlap 23:00',
          reminderId: 'xxx',
          plannedAt: getDateTimeFromClockString('23:00', 0),
        },
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
        }
      ] as any;
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r[0]).toEqual({
        id: 'SOME_TASK_1_ID',
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks.find(t => t.id === 'SOME_TASK_1_ID') as any,
        isHideTime: false,
      });
      expect(r[1]).toEqual({
        id: 'SOME_TASK_2_ID',
        type: TimelineViewEntryType.SplitTask,
        time: now + hours(4),
        data: fakeTasks.find(t => t.id === 'SOME_TASK_2_ID') as any,
        isHideTime: false,
      });
      expect(r[4].type).toEqual(TimelineViewEntryType.ScheduledTask);
    });

    it('should work for super sophisticated scenarios', () => {
      const now = 1620125839764;
      const fakeTasks: TaskCopy[] = [
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
          id: 'uDGzrv9JO',
          timeSpentOnDay: {
            '2021-05-03': 0
          },
          timeSpent: 0,
          timeEstimate: 3600000,
          title: 'Some task 1',
          reminderId: null,
          plannedAt: null,
        },
        {
          id: '0LtuSnH8s',
          timeSpent: 0,
          timeEstimate: 7200000,
          title: 'Scheduled 3 17:00',
          reminderId: 'NnqlBieeB',
          plannedAt: 1620140400000,
          _showSubTasksMode: 2,
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
        }
      ] as any;
      const r = mapToViewEntries(fakeTasks, null, undefined, now);
      expect(r).toEqual([{
        data:
          {
            id: 'X6NWaoxQ-',
            plannedAt: 1620125601000,
            reminderId: 'oejJdRc3Y',
            timeEstimate: 1980000,
            timeSpent: 0,
            title: 'Scheduled before now'
          },
        id: 'X6NWaoxQ-',
        isHideTime: false,
        time: 1620125601000,
        type: 'ScheduledTask'
      },
        {
          data:
            {
              id: 'uDGzrv9JO',
              plannedAt: null,
              reminderId: null,
              timeEstimate: 3600000,
              timeSpent: 0,
              timeSpentOnDay: {'2021-05-03': 0},
              title: 'Some task 1'
            },
          id: 'uDGzrv9JO',
          isHideTime: false,
          time: 1620127581000,
          type: 'Task'
        },
        {
          data:
            {
              id: 'mhsGdyzc_',
              plannedAt: null,
              reminderId: null,
              timeEstimate: 7200000,
              timeSpent: 0,
              title: 'Some task 2'
            },
          id: 'mhsGdyzc_',
          isHideTime: false,
          time: 1620131181000,
          type: 'SplitTask'
        },
        {
          data:
            {
              id: '68K0kYJ2s',
              plannedAt: 1620133200000,
              reminderId: 'SrgAGy8OX',
              timeEstimate: 7200000,
              timeSpent: 0,
              title: 'Scheduled 1 15:00'
            },
          id: '68K0kYJ2s',
          isHideTime: false,
          time: 1620133200000,
          type: 'ScheduledTask'
        },
        {
          data:
            {
              id: '9JTnZa-VW',
              plannedAt: 1620136800000,
              reminderId: 'avWZ5dKrW',
              timeEstimate: 9000000,
              timeSpent: 0,
              title: 'Scheduled 2 16:00'
            },
          id: '9JTnZa-VW',
          isHideTime: false,
          time: 1620136800000,
          type: 'ScheduledTask'
        },
        {
          data:
            {
              _showSubTasksMode: 2,
              id: '0LtuSnH8s',
              plannedAt: 1620140400000,
              reminderId: 'NnqlBieeB',
              timeEstimate: 7200000,
              timeSpent: 0,
              title: 'Scheduled 3 17:00'
            },
          id: '0LtuSnH8s',
          isHideTime: false,
          time: 1620140400000,
          type: 'ScheduledTask'
        },
        {
          data:
            {
              id: 'EYLy6C5_m',
              plannedAt: 1620144000000,
              reminderId: 'BNaRpF_SX',
              timeEstimate: 0,
              timeSpent: 0,
              title: 'Scheduled 4 (no duration) 18:00'
            },
          id: 'EYLy6C5_m',
          isHideTime: false,
          time: 1620144000000,
          type: 'ScheduledTask'
        },
        {
          data: {timeToGo: 5181000, title: 'Some task 2'},
          id: '1_mhsGdyzc_',
          isHideTime: false,
          time: 1620147600000,
          type: 'SplitTaskContinued'
        },
        {
          data:
            {
              id: 'xgYNyslWC',
              plannedAt: null,
              reminderId: null,
              timeEstimate: 7200000,
              timeSpent: 0,
              title: 'Sched  no overlap 9:00 (10.)'
            },
          id: 'xgYNyslWC',
          isHideTime: false,
          time: 1620152781000,
          type: 'Task'
        },
        {
          data:
            {
              id: '2nkBPQEny',
              plannedAt: 1620162000000,
              reminderId: 'K-1LvnNU5',
              timeEstimate: 0,
              timeSpent: 0,
              title: 'Sched no overlap 23:00'
            },
          id: '2nkBPQEny',
          isHideTime: false,
          time: 1620162000000,
          type: 'ScheduledTask'
        }] as any);
    });

  });

  // describe('workStartEnd', () => {
  //   it('should add work start entry if now is before start', () => {
  //     const now = getDateTimeFromClockString('7:23', 0);
  //     const workStartTimeString = '9:00';
  //     const workStartTime = getDateTimeFromClockString(workStartTimeString, 0);
  //     const fakeTasks = [
  //       {...FAKE_TASK, timeEstimate: 5000},
  //       {...FAKE_TASK},
  //     ];
  //     const workStartEndCfg: TimelineWorkStartEndCfg = {
  //       startTime: workStartTimeString,
  //       endTime: '17:00',
  //     };
  //     const r = mapToViewEntries(fakeTasks, null, workStartEndCfg, now);
  //     expect(r).toEqual([{
  //       id: 'START_TODAY',
  //       type: TimelineViewEntryType.WorkdayStart,
  //       time: workStartTime,
  //       data: workStartEndCfg,
  //       isHideTime: true,
  //     }, {
  //       id: fakeTasks[0].id,
  //       type: TimelineViewEntryType.Task,
  //       time: workStartTime,
  //       data: fakeTasks[0],
  //       isHideTime: false,
  //     }, {
  //       id: fakeTasks[1].id,
  //       type: TimelineViewEntryType.Task,
  //       time: workStartTime + 5000,
  //       data: fakeTasks[1],
  //       isHideTime: false,
  //     }]);
  //   });
  //
  //   it('should not add work start entry if now is before start and there is a current task', () => {
  //     const now = getDateTimeFromClockString('7:23', 0);
  //     const workStartTimeString = '9:00';
  //     const fakeTasks = [
  //       {...FAKE_TASK, timeEstimate: 5000, id: 'CURRENT_TASK_ID'},
  //       {...FAKE_TASK},
  //     ];
  //     const workStartEndCfg: TimelineWorkStartEndCfg = {
  //       startTime: workStartTimeString,
  //       endTime: '17:00',
  //     };
  //     const r = mapToViewEntries(fakeTasks, 'CURRENT_TASK_ID', workStartEndCfg, now);
  //     expect(r).toEqual([{
  //       id: fakeTasks[0].id,
  //       type: TimelineViewEntryType.Task,
  //       time: now,
  //       data: fakeTasks[0],
  //       isHideTime: false,
  //     }, {
  //       id: fakeTasks[1].id,
  //       type: TimelineViewEntryType.Task,
  //       time: now + 5000,
  //       data: fakeTasks[1],
  //       isHideTime: false,
  //     }]);
  //   });
  //
  //   it('should not add work end entry if tasks take longer than that', () => {
  //     const now = getDateTimeFromClockString('16:23', 0);
  //     const workEndTimeString = '18:00';
  //     const fakeTasks = [
  //       {...FAKE_TASK, timeEstimate: hours(2), title: 'Some task title'},
  //       {...FAKE_TASK},
  //     ];
  //     const workStartEndCfg: TimelineWorkStartEndCfg = {
  //       startTime: '9:00',
  //       endTime: workEndTimeString,
  //     };
  //     const r = mapToViewEntries(fakeTasks, null, workStartEndCfg, now);
  //     expect(r).toEqual([
  //       {
  //         data: fakeTasks[0],
  //         id: 'FAKE_TASK_ID',
  //         isHideTime: false,
  //         time: 55380000,
  //         type: TimelineViewEntryType.SplitTask
  //       },
  //       {
  //         data: workStartEndCfg,
  //         id: 'END_TODAY',
  //         isHideTime: true,
  //         time: 61200000,
  //         type: TimelineViewEntryType.WorkdayEnd
  //       },
  //       {
  //         data: workStartEndCfg,
  //         id: 'START_TOMORROW',
  //         isHideTime: true,
  //         time: 1620025200000,
  //         type: TimelineViewEntryType.WorkdayStart
  //       },
  //       {
  //         data: {timeToGo: 1380000, title: 'Some task title'},
  //         id: 'FAKE_TASK_ID__1',
  //         isHideTime: false,
  //         time: 1620025200000,
  //         type: TimelineViewEntryType.SplitTaskContinued
  //       } as any,
  //       {
  //         data: fakeTasks[1],
  //         id: 'FAKE_TASK_ID',
  //         isHideTime: false,
  //         time: 1620026580000,
  //         type: TimelineViewEntryType.Task
  //       },
  //     ]);
  //   });
  //
  // });
});
