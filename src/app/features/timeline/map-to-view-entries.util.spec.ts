import { mapToViewEntries } from './map-to-view-entries.util';
import { TaskCopy } from '../tasks/task.model';
import { TimelineViewEntryType } from './timeline.model';

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
    const startTime = 33;
    const fakeTasks = [
      {...FAKE_TASK, timeEstimate: 5000},
      {...FAKE_TASK},
    ];
    const r = mapToViewEntries(fakeTasks, null, startTime);
    expect(r).toEqual([{
      id: fakeTasks[0].id,
      type: TimelineViewEntryType.Task,
      time: startTime,
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
    const startTime = 44;
    const fakeTasks = [
      {...FAKE_TASK, timeEstimate: 5000},
      {...FAKE_TASK, timeEstimate: 8000},
      {...FAKE_TASK, timeEstimate: 5000, timeSpent: 5000},
      {...FAKE_TASK},
      {...FAKE_TASK, timeEstimate: 3000, timeSpent: 1000},
      {...FAKE_TASK},
    ];
    const r = mapToViewEntries(fakeTasks, null, startTime);
    expect(r).toEqual([{
      id: FID,
      type: TimelineViewEntryType.Task,
      time: startTime,
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
});
