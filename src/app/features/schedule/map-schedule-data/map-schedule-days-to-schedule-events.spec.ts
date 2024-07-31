import { mapScheduleDaysToScheduleEvents } from './map-schedule-days-to-schedule-events';
import { FH, ScheduleViewEntryType } from '../schedule.const';
import { ScheduleDay, ScheduleViewEntryTask } from '../schedule.model';
import { TaskCopy } from '../../tasks/task.model';

const H = 60 * 60 * 1000;

const FAKE_DAY: ScheduleDay = {
  dayDate: '20/12/2020',
  entries: [],
  isToday: false,
  beyondBudgetTasks: [],
};
const FAKE_TASK_ENTRY: ScheduleViewEntryTask = {
  id: 'XXX',
  data: {
    title: 'TITLE',
    timeEstimate: 66,
    timeSpent: 0,
    id: 'XXX',
    tagIds: [],
    subTaskIds: [],
  } as Partial<TaskCopy> as TaskCopy,
  timeToGo: H,
  start: new Date('2020-1-1 00:00').getUTCMilliseconds(),
  type: ScheduleViewEntryType.Task,
};

const fakeDay = (additional?: Partial<ScheduleDay>): ScheduleDay => {
  return {
    ...FAKE_DAY,
    ...additional,
  };
};

const fakeTaskEntry = (
  id = 'XXX',
  additional?: Partial<ScheduleViewEntryTask>,
  additionalTaskData?: Partial<TaskCopy>,
): ScheduleViewEntryTask => {
  return {
    ...FAKE_TASK_ENTRY,
    ...additional,
    data: {
      ...FAKE_TASK_ENTRY.data,
      ...additionalTaskData,
      title: `${id}_TITLE`,
      id,
    },
    id,
  };
};

describe('mapScheduleDaysToScheduleEvents()', () => {
  it('should return eventsFlat and beyondBudgetDays', () => {
    const res = mapScheduleDaysToScheduleEvents([], FH);
    expect(res).toEqual({ eventsFlat: [], beyondBudgetDays: [] });
  });

  it('should return eventsFlat and beyondBudgetDays', () => {
    const res = mapScheduleDaysToScheduleEvents(
      [
        fakeDay({
          entries: [
            fakeTaskEntry('AAA', {
              start: new Date('2020-1-1 05:00').getTime(),
              timeToGo: H,
            }),
            fakeTaskEntry('BBB', {
              start: new Date('2020-1-1 06:00').getTime(),
              timeToGo: 0.5 * H,
            }),
          ],
        }),
      ],
      FH,
    );
    expect(res).toEqual({
      beyondBudgetDays: [[]],
      eventsFlat: [
        {
          data: {
            id: 'AAA',
            title: 'AAA_TITLE',
            subTaskIds: [],
            tagIds: [],
            timeEstimate: 66,
            timeSpent: 0,
          } as Partial<TaskCopy> as TaskCopy,
          id: 'AAA',
          startHours: 5,
          style: 'grid-column: 2;  grid-row: 61 / span 12',
          timeLeftInHours: 1,
          title: 'AAA_TITLE',
          type: 'Task' as ScheduleViewEntryType,
        },
        {
          data: {
            title: 'BBB_TITLE',
            id: 'BBB',
            subTaskIds: [],
            tagIds: [],
            timeEstimate: 66,
            timeSpent: 0,
          } as Partial<TaskCopy> as TaskCopy,
          id: 'BBB',
          startHours: 6,
          style: 'grid-column: 2;  grid-row: 73 / span 6',
          timeLeftInHours: 0.5,
          title: 'BBB_TITLE',
          type: 'Task' as ScheduleViewEntryType,
        },
      ],
    });
  });
});
