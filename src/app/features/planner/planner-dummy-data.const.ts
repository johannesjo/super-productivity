import { PlannerDay, ScheduleItemType } from './planner.model';
import { DEFAULT_TASK } from '../tasks/task.model';
import { DEFAULT_TASK_REPEAT_CFG } from '../task-repeat-cfg/task-repeat-cfg.model';

const FAKE_TASK = {
  ...DEFAULT_TASK,
  id: '11',
  title: 'Default fake task',
  timeEstimate: 60 * 60 * 1000,
};
export const PLANNER_DUMMY_DATA: PlannerDay[] = [
  {
    isToday: true,
    dayDate: '2021-09-01',
    timeEstimate: 3,
    timeLimit: 7,
    tasks: [
      {
        ...FAKE_TASK,
        timeEstimate: 0,
      },
    ],
    scheduledIItems: [
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: {
          ...FAKE_TASK,
          timeEstimate: 0,
        },
        // eslint-disable-next-line no-mixed-operators
        start: Date.now() - 1000 * 60 * 60 * 4,
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.CalEvent,
        id: 'aaa',
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
        calendarEvent: {
          title:
            'Some  cal event from google calendar, as you know can have longer and weird titles',
          duration: 1000 * 60 * 60 * 2,
        },
      },
      {
        type: ScheduleItemType.RepeatProjection,
        id: 'aaa',
        repeatCfg: {
          ...DEFAULT_TASK_REPEAT_CFG,
          title: 'Repeat task projection',
          defaultEstimate: 1000 * 60 * 60 * 2.5,
          id: 'asd',
        },
        // eslint-disable-next-line no-mixed-operators
        start: Date.now() + 1000 * 60 * 60 * 2,
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 4,
      },
    ],
  },
  {
    dayDate: '2021-09-02',
    timeEstimate: 3,
    timeLimit: 7,
    tasks: [FAKE_TASK],
    scheduledIItems: [
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
    ],
  },
  {
    dayDate: '2021-09-03',
    timeEstimate: 3,
    timeLimit: 7,
    tasks: [FAKE_TASK],
    scheduledIItems: [
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
    ],
  },
  {
    dayDate: '2021-09-04',
    timeEstimate: 3,
    timeLimit: 7,
    tasks: [FAKE_TASK],
    scheduledIItems: [
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
    ],
  },
  {
    dayDate: '2021-09-05',
    timeEstimate: 4,
    timeLimit: 7,
    tasks: [FAKE_TASK],
    scheduledIItems: [
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
      {
        type: ScheduleItemType.Task,
        id: 'aaa',
        task: FAKE_TASK,
        start: Date.now(),
        // eslint-disable-next-line no-mixed-operators
        end: Date.now() + 1000 * 60 * 60 * 2,
      },
    ],
  },
];
