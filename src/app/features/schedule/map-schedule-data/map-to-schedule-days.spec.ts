import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskCopy, TaskPlanned } from '../../tasks/task.model';

const NDS = '1970-01-01';
// const N = new Date(`${NDS} 01:00`).getTime();
const N = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
// 86400000 ==> 24h
const H = 60 * 60 * 1000;

const FAKE_TASK: Partial<TaskCopy> = {
  tagIds: [],
  subTaskIds: [],
  timeSpent: 0,
  timeEstimate: H,
};

// eslint-disable-next-line no-mixed-operators
const minAfterNow = (min: number): Date => new Date(Date.UTC(1970, 0, 1, 0, min, 0, 0));

const minAfterNowTs = (min: number): number => minAfterNow(min).getTime();

console.log(N);
console.log(minAfterNow(30));

const fakeTaskEntry = (id = 'XXX', add?: Partial<TaskCopy>): TaskCopy => {
  return {
    ...FAKE_TASK,
    ...add,
    id,
  } as TaskCopy;
};

const fakePlannedTaskEntry = (
  id = 'XXX',
  planedAt: Date,
  add?: Partial<TaskPlanned>,
): TaskPlanned => {
  return {
    ...fakeTaskEntry(id, add),
    plannedAt: planedAt.getTime(),
    reminderId: 'R_ID',
  } as TaskPlanned;
};

describe('mapToScheduleDays()', () => {
  it('should work for empty case', () => {
    expect(
      mapToScheduleDays(N, [], [], [], [], [], [], null, {}, undefined, undefined),
    ).toEqual([]);
  });

  it('should work for simple case', () => {
    expect(
      mapToScheduleDays(
        N,
        [NDS, '2020-1-2'],
        [
          fakeTaskEntry('1', { timeEstimate: H }),
          fakeTaskEntry('2', { timeEstimate: 2 * H }),
        ],
        [],
        [],
        [],
        [],
        null,
        {},
        undefined,
        undefined,
      ),
    ).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: NDS,
        entries: [
          {
            data: {
              ...FAKE_TASK,
              id: '1',
              timeEstimate: H,
              timeSpent: 0,
            },
            id: '1',
            start: 0,
            timeToGo: H,
            type: 'Task',
          },
          {
            data: {
              ...FAKE_TASK,
              id: '2',
              timeEstimate: 2 * H,
              timeSpent: 0,
            },
            id: '2',
            start: H,
            timeToGo: 2 * H,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '2020-1-2', entries: [], isToday: false },
    ] as any);
  });

  it('should work for simple scheduled case', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: H })],
      [],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );
    expect(r[0].entries.length).toBe(3);
    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: {
              id: 'N1',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: H,
              timeSpent: 0,
            },
            id: 'N1',
            start: 0,
            timeToGo: H * 0.5,
            type: 'SplitTask',
          },
          {
            data: {
              id: 'S1',
              plannedAt: minAfterNowTs(30),
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: H,
              timeSpent: 0,
            },
            id: 'S1',
            start: minAfterNowTs(30),
            timeToGo: H,
            type: 'ScheduledTask',
          },
          {
            data: { index: 0, projectId: undefined, taskId: 'N1', title: undefined },
            id: 'N1__0',
            start: minAfterNowTs(90),
            timeToGo: H * 0.5,
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
    ] as any);
  });

  it('should split multiple times', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: 2 * H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [
        fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: 0.5 * H }),
        fakePlannedTaskEntry('S2', minAfterNow(90), { timeEstimate: 0.5 * H }),
      ],
      [],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );
    expect(r[0].entries.length).toBe(5);
    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            timeToGo: H * 0.5,
            type: 'SplitTask',
          },
          {
            data: jasmine.any(Object),
            id: 'S1',
            start: minAfterNowTs(30),
            timeToGo: 0.5 * H,
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__0',
            start: minAfterNowTs(60),
            timeToGo: 0.5 * H,
            type: 'SplitTaskContinued',
          },
          {
            data: jasmine.any(Object),
            id: 'S2',
            start: minAfterNowTs(90),
            timeToGo: 0.5 * H,
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__1',
            start: minAfterNowTs(120),
            timeToGo: H,
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
    ] as any);
  });

  // fit('should work for case with one of each', () => {});
});
