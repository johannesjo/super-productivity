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
      type: TimelineViewEntryType.TaskFull,
      time: startTime,
      data: fakeTasks[0]
    }, {
      id: fakeTasks[1].id,
      type: TimelineViewEntryType.TaskFull,
      time: 5033,
      data: fakeTasks[1]
    }]);
  });
});
