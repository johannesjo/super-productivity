import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskCopy } from '../../tasks/task.model';

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

console.log(N);
console.log(minAfterNow(30));

const fakeTaskEntry = (id = 'XXX', add?: Partial<TaskCopy>): TaskCopy => {
  return {
    ...FAKE_TASK,
    ...add,
    id,
  } as TaskCopy;
};

// const fakePlannedTaskEntry = (
//   id = 'XXX',
//   planedAt: Date,
//   add?: Partial<TaskPlanned>,
// ): TaskPlanned => {
//   return {
//     ...fakeTaskEntry(id, add),
//     plannedAt: planedAt.getUTCMilliseconds(),
//     reminderId: 'R_ID',
//   } as TaskPlanned;
// };

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

  // it('should work for simple scheduled case', () => {
  //   // TODO fix this should result in a split task
  //   expect(
  //     mapToScheduleDays(
  //       N,
  //       [NDS, '1970-01-02'],
  //       [
  //         fakeTaskEntry('1', { timeEstimate: 2 * H }),
  //         // fakeTaskEntry('2', { timeEstimate: 2 * H }),
  //       ],
  //       [fakePlannedTaskEntry('3', minAfterNow(15), { timeEstimate: H })],
  //       [],
  //       [],
  //       [],
  //       null,
  //       {},
  //       undefined,
  //       undefined,
  //     ),
  //   ).toEqual([
  //     {
  //       beyondBudgetTasks: [],
  //       dayDate: '1970-01-01',
  //       entries: [
  //         {
  //           data: {
  //             id: '3',
  //             plannedAt: 0,
  //             reminderId: 'R_ID',
  //             subTaskIds: [],
  //             tagIds: [],
  //             timeEstimate: 3600000,
  //             timeSpent: 0,
  //           },
  //           id: '3',
  //           start: 0,
  //           timeToGo: 3600000,
  //           type: 'ScheduledTask',
  //         },
  //         {
  //           data: {
  //             id: '1',
  //             subTaskIds: [],
  //             tagIds: [],
  //             timeEstimate: 3600000,
  //             timeSpent: 0,
  //           },
  //           id: '1',
  //           start: 3600000,
  //           timeToGo: 3600000,
  //           type: 'Task',
  //         },
  //       ],
  //       isToday: true,
  //     },
  //     { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
  //   ] as any);
  // });

  // fit('should work for case with one of each', () => {});
});
