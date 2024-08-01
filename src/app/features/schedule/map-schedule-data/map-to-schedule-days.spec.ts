import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskCopy, TaskPlanned } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

const NDS = '1970-01-01';
const N = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
// 86400000 ==> 24h
const H = 60 * 60 * 1000;
const TZ_OFFSET = new Date(NDS).getTimezoneOffset() * 60000;

const FAKE_TASK: Partial<TaskCopy> = {
  tagIds: [],
  subTaskIds: [],
  timeSpent: 0,
  timeEstimate: H,
};

const h = (hr: number): number => hr * 60 * 1000 * 60;
const hTz = (hr: number): number => h(hr) + TZ_OFFSET;
// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-mixed-operators
const dh = (d: number = 0, hr: number): number => hr * H + d * h(24);
const dhTz = (d: number = 0, hr: number): number => dh(d, hr) + TZ_OFFSET;

// eslint-disable-next-line no-mixed-operators
const minAfterNow = (min: number): Date => new Date(Date.UTC(1970, 0, 1, 0, min, 0, 0));

const minAfterNowTs = (min: number): number => minAfterNow(min).getTime();

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

const fakeRepeatCfg = (
  id = 'R_CFG_1',
  startTime?: string,
  add?: Partial<TaskRepeatCfg>,
): TaskRepeatCfg => {
  return {
    startDate: '1969-01-01',
    startTime,
    // eslint-disable-next-line no-mixed-operators
    lastTaskCreation: N - 24 * 60 * 60 * 1000,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
    repeatCycle: 'DAILY',
    repeatEvery: 1,
    defaultEstimate: h(1),
    ...add,
    id,
  } as Partial<TaskRepeatCfg> as TaskRepeatCfg;
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
          fakeTaskEntry('1', { timeEstimate: h(1) }),
          fakeTaskEntry('2', { timeEstimate: h(2) }),
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
              timeEstimate: h(1),
              timeSpent: 0,
            },
            id: '1',
            start: 0,
            duration: h(1),
            type: 'Task',
          },
          {
            data: {
              ...FAKE_TASK,
              id: '2',
              timeEstimate: h(2),
              timeSpent: 0,
            },
            id: '2',
            start: h(1),
            duration: h(2),
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
        fakeTaskEntry('N1', { timeEstimate: h(1) }),
        // fakeTaskEntry('2', { timeEstimate: h(2 }),
      ],
      [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: h(1) })],
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
              timeEstimate: h(1),
              timeSpent: 0,
            },
            id: 'N1',
            start: 0,
            duration: h(0.5),
            type: 'SplitTask',
          },
          {
            data: {
              id: 'S1',
              plannedAt: minAfterNowTs(30),
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: h(1),
              timeSpent: 0,
            },
            id: 'S1',
            start: minAfterNowTs(30),
            duration: h(1),
            type: 'ScheduledTask',
          },
          {
            data: { index: 0, projectId: undefined, taskId: 'N1', title: undefined },
            id: 'N1__0',
            start: minAfterNowTs(90),
            duration: h(0.5),
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
        fakeTaskEntry('N1', { timeEstimate: h(2) }),
        // fakeTaskEntry('2', { timeEstimate: h(2 }),
      ],
      [
        fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: h(0.5) }),
        fakePlannedTaskEntry('S2', minAfterNow(90), { timeEstimate: h(0.5) }),
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
            duration: h(0.5),
            type: 'SplitTask',
          },
          {
            data: jasmine.any(Object),
            id: 'S1',
            start: minAfterNowTs(30),
            duration: h(0.5),
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__0',
            start: minAfterNowTs(60),
            duration: h(0.5),
            type: 'SplitTaskContinued',
          },
          {
            data: jasmine.any(Object),
            id: 'S2',
            start: minAfterNowTs(90),
            duration: h(0.5),
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__1',
            start: minAfterNowTs(120),
            duration: h(1),
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
    ] as any);
  });

  it('should show repeat for next day', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: h(2) }),
        // fakeTaskEntry('2', { timeEstimate: h(2 }),
      ],
      [],
      // [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: h(1 })],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: h(1) })],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            duration: h(2),
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'R1',
            start: h(24),
            duration: h(1),
            type: 'ScheduledRepeatProjection',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should spit around scheduled repeat task cases', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: h(24) }),
        fakeTaskEntry('N2', { timeEstimate: h(2) }),
        // fakeTaskEntry('2', { timeEstimate: h(2 }),
      ],
      [],
      // [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: h(1 })],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: h(1) })],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            // eslint-disable-next-line no-mixed-operators
            duration: h(24),
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N2',
            // eslint-disable-next-line no-mixed-operators
            start: hTz(24),
            duration: h(1),
            type: 'SplitTask',
          },
          {
            data: jasmine.any(Object),
            id: 'R1',
            // eslint-disable-next-line no-mixed-operators
            start: hTz(25),
            duration: h(1),
            type: 'ScheduledRepeatProjection',
          },
          {
            data: jasmine.any(Object),
            id: 'N2__0',
            // eslint-disable-next-line no-mixed-operators
            start: hTz(26),
            duration: h(1),
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should work for NON-scheduled repeat task cases', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: h(24) }),
        fakeTaskEntry('N2', { timeEstimate: h(1) }),
      ],
      [],
      [],
      [
        fakeRepeatCfg('R1', undefined, {
          defaultEstimate: h(2),
          lastTaskCreation: N + 60000,
        }),
      ],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            // eslint-disable-next-line no-mixed-operators
            duration: h(24),
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'R1',
            // eslint-disable-next-line no-mixed-operators
            start: hTz(24),
            duration: h(2),
            type: 'RepeatProjection',
          },
          {
            data: jasmine.any(Object),
            id: 'N2',
            // eslint-disable-next-line no-mixed-operators
            start: 26 * H + TZ_OFFSET,
            duration: h(1),
            type: 'Task',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should sort in planned tasks to their days', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02', '1970-01-03', '1970-01-04'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: h(2) }),
      ],
      [],
      [],
      [],
      [],
      null,
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-02': [
          fakeTaskEntry('FD1', { timeEstimate: h(1) }),
          fakeTaskEntry('FD2', { timeEstimate: h(2) }),
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-04': [
          fakeTaskEntry('FD3', { timeEstimate: h(1) }),
          fakeTaskEntry('FD4', { timeEstimate: h(0.5) }),
        ],
      },
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            duration: h(2),
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'FD1',
            start: 82800000,
            duration: h(1),
            type: 'TaskPlannedForDay',
          },
          {
            data: jasmine.any(Object),
            id: 'FD2',
            start: 86400000,
            duration: h(2),
            type: 'TaskPlannedForDay',
          },
        ],
        isToday: false,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-03', entries: [], isToday: false },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-04',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'FD3',
            start: 255600000,
            duration: h(1),
            type: 'TaskPlannedForDay',
          },
          {
            data: jasmine.any(Object),
            id: 'FD4',
            start: 259200000,
            duration: h(0.5),
            type: 'TaskPlannedForDay',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('UNTESTED SO CHECK IF FAILING  should work for an example with all the stuff', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02', '1970-01-03', '1970-01-04'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: h(2) }),
      ],
      [
        // BEFORE WORK
        fakePlannedTaskEntry('S1', minAfterNow(2 * 60), { timeEstimate: h(1) }),
        // NEXT DAY AT 10
        fakePlannedTaskEntry('S2', minAfterNow(34 * 60), { timeEstimate: h(0.5) }),
      ],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: h(1) })],
      [
        fakeRepeatCfg('R1', undefined, {
          defaultEstimate: h(2),
          lastTaskCreation: N + 60000,
        }),
      ],
      [],
      null,
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-02': [
          fakeTaskEntry('FD1', { timeEstimate: h(4) }),
          fakeTaskEntry('FD2', { timeEstimate: h(2) }),
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-04': [
          fakeTaskEntry('FD3', { timeEstimate: h(1) }),
          fakeTaskEntry('FD4', { timeEstimate: h(0.5) }),
        ],
      },
      {
        startTime: '9:00',
        endTime: '17:00',
      },
      {
        startTime: '12:00',
        endTime: '13:00',
      },
    );

    expect(r[0]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-01',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'S1',
          start: h(2),
          duration: h(1),
          type: 'ScheduledTask',
        },
        {
          data: jasmine.any(Object),
          id: 'N1',
          start: hTz(9),
          duration: h(2),
          type: 'Task',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_39600000',
          start: hTz(12),
          duration: h(1),
          type: 'LunchBreak',
        },
      ],
      isToday: true,
    } as any);

    expect(r[1]).toEqual({
      beyondBudgetTasks: [
        { id: 'FD2', subTaskIds: [], tagIds: [], timeEstimate: h(2), timeSpent: 0 },
      ],
      dayDate: '1970-01-02',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: dhTz(1, 9),
          duration: h(2),
          type: 'RepeatProjection',
        },
        {
          data: jasmine.any(Object),
          id: 'S2',
          start: dhTz(1, 11),
          duration: h(0.5),
          type: 'ScheduledTask',
        },
        {
          data: jasmine.any(Object),
          id: 'FD1',
          start: dhTz(1, 11.5),
          duration: h(0.5),
          type: 'SplitTaskPlannedForDay',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_126000000',
          start: dhTz(1, 12),
          duration: h(1),
          type: 'LunchBreak',
        },
        {
          data: jasmine.any(Object),
          id: 'FD1__0',
          start: dhTz(1, 13),
          duration: h(3.5),
          type: 'SplitTaskContinuedLast',
        },
      ],
      isToday: false,
    } as any);

    expect(r[2]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-03',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: 201600000,
          duration: 7200000,
          type: 'RepeatProjection',
        },
        {
          data: { endTime: '13:00', startTime: '12:00' },
          id: 'LUNCH_BREAK_212400000',
          start: 212400000,
          duration: 3600000,
          type: 'LunchBreak',
        },
      ],
      isToday: false,
    } as any);
    expect(r[3]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-04',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: 288000000,
          duration: h(2),
          type: 'RepeatProjection',
        },
        {
          data: jasmine.any(Object),
          id: 'FD3',
          start: 295200000,
          duration: 3600000,
          type: 'TaskPlannedForDay',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_298800000',
          start: 298800000,
          duration: 3600000,
          type: 'LunchBreak',
        },
        {
          data: jasmine.any(Object),
          id: 'FD4',
          start: 302400000,
          duration: 1800000,
          type: 'TaskPlannedForDay',
        },
      ],
      isToday: false,
    } as any);
  });
});
