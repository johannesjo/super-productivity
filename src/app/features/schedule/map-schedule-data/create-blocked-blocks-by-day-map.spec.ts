import { createBlockedBlocksByDayMap } from './create-blocked-blocks-by-day-map';
import { TaskCopy, TaskWithDueTime } from '../../tasks/task.model';

/* eslint-disable @typescript-eslint/naming-convention */

const NDS = '1970-01-01';
const H = 60 * 60 * 1000;
const TZ_OFFSET = new Date(NDS).getTimezoneOffset() * 60000;

const FAKE_TASK: Partial<TaskCopy> = {
  tagIds: [],
  subTaskIds: [],
  timeSpent: 0,
  timeEstimate: H,
};

const h = (hr: number): number => hr * 60 * 1000 * 60;
// const hTz = (hr: number): number => h(hr) + TZ_OFFSET;
// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-mixed-operators
const dh = (d: number = 0, hr: number): number => hr * H + d * h(24);
const dhTz = (d: number = 0, hr: number): number => dh(d, hr) + TZ_OFFSET;

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
  add?: Partial<TaskWithDueTime>,
): TaskWithDueTime => {
  return {
    ...fakeTaskEntry(id, add),
    dueWithTime: planedAt.getTime(),
    reminderId: 'R_ID',
  } as TaskWithDueTime;
};

describe('createBlockedBlocksByDayMap()', () => {
  it('should work for empty case', () => {
    const r = createBlockedBlocksByDayMap([], [], [], undefined, undefined, 0);
    expect(r).toEqual({});
  });

  it('should work for basic case', () => {
    const r = createBlockedBlocksByDayMap(
      [],
      [],
      [],
      { startTime: '9:00', endTime: '17:00' },
      undefined,
      0,
      1,
    );
    expect(r).toEqual({
      '1970-01-01': [
        {
          start: dhTz(0, 17),
          end: dhTz(0, 24),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 115200000,
              start: dhTz(0, 17),
              type: 'WorkdayStartEnd',
            },
          ],
        },
      ],
      '1970-01-02': [
        {
          end: 115200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              start: dhTz(0, 17),
              end: dhTz(1, 9),
              type: 'WorkdayStartEnd',
            },
          ],
          start: 82800000,
        },
      ],
    } as any);
  });

  it('should work filter out entries beyond bounds', () => {
    const r = createBlockedBlocksByDayMap(
      [fakePlannedTaskEntry('1', new Date(dhTz(1, 18)), { timeEstimate: h(1) })],
      [],
      [],
      { startTime: '9:00', endTime: '17:00' },
      undefined,
      0,
      2,
    );
    expect(r).toEqual({
      '1970-01-01': [
        {
          start: dhTz(0, 17),
          end: dhTz(0, 24),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              start: dhTz(0, 17),
              end: dhTz(1, 9),
              type: 'WorkdayStartEnd',
            },
          ],
        },
      ],
      '1970-01-02': [
        {
          start: dhTz(1, 0),
          end: dhTz(1, 9),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              start: dhTz(0, 17),
              end: dhTz(1, 9),
              type: 'WorkdayStartEnd',
            },
          ],
        },
        {
          start: dhTz(1, 17),
          end: dhTz(2, 0),
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              start: dhTz(1, 17),
              end: dhTz(2, 9),
              type: 'WorkdayStartEnd',
            },
            {
              data: {
                id: '1',
                dueWithTime: dhTz(1, 18),
                reminderId: 'R_ID',
                subTaskIds: [],
                tagIds: [],
                timeEstimate: h(1),
                timeSpent: 0,
              },
              start: dhTz(1, 18),
              end: dhTz(1, 19),
              type: 'ScheduledTask',
            },
          ],
        },
      ],
      '1970-01-03': [
        {
          end: 201600000,
          start: 169200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 201600000,
              start: 144000000,
              type: 'WorkdayStartEnd',
            },
          ],
        },
      ],
    } as any);
  });

  it('should work for very long scheduled tasks', () => {
    const r = createBlockedBlocksByDayMap(
      [fakePlannedTaskEntry('S1', new Date(dhTz(1, 18)), { timeEstimate: h(48) })],
      [],
      [],
      { startTime: '9:00', endTime: '17:00' },
      undefined,
      0,
      2,
    );
    expect(Object.keys(r).length).toBe(4);
    expect(Object.keys(r)).toEqual([
      '1970-01-01',
      '1970-01-02',
      '1970-01-03',
      '1970-01-04',
    ]);
    expect(r['1970-01-01']).toEqual([
      {
        start: dhTz(0, 17),
        end: dhTz(0, 24),
        entries: [
          {
            data: { endTime: '17:00', startTime: '9:00' },
            start: dhTz(0, 17),
            end: dhTz(1, 9),
            type: 'WorkdayStartEnd',
          },
        ],
      },
    ] as any);
    expect(r['1970-01-02']).toEqual([
      {
        start: dhTz(1, 0),
        end: dhTz(1, 9),
        entries: [
          {
            data: { endTime: '17:00', startTime: '9:00' },
            end: dhTz(1, 9),
            start: dhTz(0, 17),
            type: 'WorkdayStartEnd',
          },
        ],
      },
      {
        start: dhTz(1, 17),
        end: dhTz(1, 24),
        entries: [
          {
            data: {
              id: 'S1',
              dueWithTime: dhTz(1, 18),
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: 172800000,
              timeSpent: 0,
            },
            start: dhTz(1, 18),
            end: dhTz(1, 24),
            type: 'ScheduledTask',
          },
          {
            data: { endTime: '17:00', startTime: '9:00' },
            start: dhTz(1, 17),
            end: dhTz(2, 9),
            type: 'WorkdayStartEnd',
          },
        ] as any,
      },
    ]);
    expect(r['1970-01-03']).toEqual([
      {
        start: dhTz(2, 0),
        end: dhTz(2, 24),
        entries: [
          {
            data: {
              id: 'S1',
              dueWithTime: 147600000,
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: 172800000,
              timeSpent: 0,
            },
            start: dhTz(2, 0),
            end: dhTz(2, 24),
            type: 'ScheduledTaskSplit',
          },
          {
            data: { endTime: '17:00', startTime: '9:00' },
            start: dhTz(1, 17),
            end: dhTz(2, 9),
            type: 'WorkdayStartEnd',
          },
        ],
      },
    ] as any);
    expect(r['1970-01-04']).toEqual([
      {
        start: dhTz(3, 0),
        end: dhTz(3, 18),
        entries: [
          {
            data: {
              id: 'S1',
              dueWithTime: 147600000,
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: 172800000,
              timeSpent: 0,
            },
            start: dhTz(3, 0),
            end: dhTz(3, 18),
            type: 'ScheduledTaskSplit',
          },
        ],
      },
    ] as any);
  });
});
