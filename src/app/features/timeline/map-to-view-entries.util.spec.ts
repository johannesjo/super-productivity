import { mapToViewEntries } from './map-to-view-entries.util';
import { TaskCopy } from '../tasks/task.model';
import { TimelineViewEntryType, TimelineWorkStartEndCfg } from './timeline.model';
import { getDateTimeFromClockString } from '../../util/get-date-time-from-clock-string';

const FID = 'FAKE_TASK_ID';
const FAKE_TASK: TaskCopy = {
  id: FID,
  timeSpent: 0,
  timeEstimate: 0,
  plannedAt: null,
  reminderId: null,
} as any;

describe('mapToViewEntries()', () => {
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
    const now = 44;
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
      time: 5044,
      data: fakeTasks[1],
      isHideTime: false,
    }, {
      id: FID,
      type: TimelineViewEntryType.Task,
      time: 13044,
      data: fakeTasks[2],
      isHideTime: false,
    }, {
      id: FID,
      type: TimelineViewEntryType.Task,
      time: 13044,
      data: fakeTasks[3],
      isHideTime: true,
    }, {
      id: FID,
      type: TimelineViewEntryType.Task,
      time: 13044,
      data: fakeTasks[4],
      isHideTime: true,
    }, {
      id: FID,
      type: TimelineViewEntryType.Task,
      time: 15044,
      data: fakeTasks[5],
      isHideTime: false,
    }]);
  });

  describe('workStartEnd', () => {
    it('should add work start entry if now is before start', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const workStartTimeString = '9:00';
      const workStartTime = getDateTimeFromClockString(workStartTimeString, 0);
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: 5000},
        {...FAKE_TASK},
      ];
      const workStartEndCfg: TimelineWorkStartEndCfg = {
        startTime: workStartTimeString,
        endTime: '17:00',
      };
      const r = mapToViewEntries(fakeTasks, null, workStartEndCfg, now);
      expect(r).toEqual([{
        id: 'START_TODAY',
        type: TimelineViewEntryType.WorkdayStart,
        time: workStartTime,
        data: workStartEndCfg,
        isHideTime: true,
      }, {
        id: fakeTasks[0].id,
        type: TimelineViewEntryType.Task,
        time: workStartTime,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: fakeTasks[1].id,
        type: TimelineViewEntryType.Task,
        time: workStartTime + 5000,
        data: fakeTasks[1],
        isHideTime: false,
      }]);
    });

    it('should not add work start entry if now is before start and there is a current task', () => {
      const now = getDateTimeFromClockString('7:23', 0);
      const workStartTimeString = '9:00';
      const fakeTasks = [
        {...FAKE_TASK, timeEstimate: 5000, id: 'CURRENT_TASK_ID'},
        {...FAKE_TASK},
      ];
      const workStartEndCfg: TimelineWorkStartEndCfg = {
        startTime: workStartTimeString,
        endTime: '17:00',
      };
      const r = mapToViewEntries(fakeTasks, 'CURRENT_TASK_ID', workStartEndCfg, now);
      expect(r).toEqual([{
        id: fakeTasks[0].id,
        type: TimelineViewEntryType.Task,
        time: now,
        data: fakeTasks[0],
        isHideTime: false,
      }, {
        id: fakeTasks[1].id,
        type: TimelineViewEntryType.Task,
        time: now + 5000,
        data: fakeTasks[1],
        isHideTime: false,
      }]);
    });
  });
});
