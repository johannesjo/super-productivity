import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskCopy, TaskPlanned } from '../../tasks/task.model';

const NDS = '1970-1-1';
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
const minAfterNow = (min: number): Date => new Date(N + min * 60000);

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
    plannedAt: planedAt.getUTCMilliseconds(),
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
        ['1970-1-1', '2020-1-2'],
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
        dayDate: '1970-1-1',
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

  xit('should work for case with one of each', () => {
    expect(
      mapToScheduleDays(
        N,
        [NDS, '2020-1-2'],
        [
          fakeTaskEntry('1', { timeEstimate: H }),
          // fakeTaskEntry('2', { timeEstimate: 2 * H }),
        ],
        [fakePlannedTaskEntry('3', minAfterNow(30), { timeEstimate: H })],
        [],
        [],
        [],
        null,
        {},
        undefined,
        undefined,
      ),
    ).toEqual([] as any);
  });
});
