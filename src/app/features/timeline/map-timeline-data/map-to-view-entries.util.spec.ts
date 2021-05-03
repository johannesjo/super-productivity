import { mapToViewEntries } from './map-to-view-entries.util';
import { TaskCopy } from '../../tasks/task.model';
import { TimelineViewEntryType, TimelineWorkStartEndCfg } from '../timeline.model';
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
      // const plannedTaskStartTime = getDateTimeFromClockString('12:25', 25 * 60 * 60 * 1000);
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
