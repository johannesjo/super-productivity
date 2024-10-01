import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';

/* eslint-disable no-mixed-operators */

const FAKE_MONDAY_THE_10TH = dateStrToUtcDate('2022-01-10').getTime();

const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  ...DEFAULT_TASK_REPEAT_CFG,
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  quickSetting: 'DAILY',
  lastTaskCreation: FAKE_MONDAY_THE_10TH,
  defaultEstimate: undefined,
  projectId: null,
  startTime: undefined,
  remindAt: undefined,
  isPaused: false,
  repeatCycle: 'WEEKLY',
  startDate: getWorklogStr(FAKE_MONDAY_THE_10TH),
  repeatEvery: 1,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  tagIds: [],
  order: 0,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const dummyRepeatable = (id: string, fields: Partial<TaskRepeatCfg>): TaskRepeatCfg => ({
  ...DUMMY_REPEATABLE_TASK,
  id,
  ...fields,
});

const testCase = (
  cfg: TaskRepeatCfg,
  today: Date,
  startDate: Date | number,
  expected: Date | null,
): void => {
  if (expected) {
    expected.setHours(2, 0, 0, 0);
  }

  expect(
    getNewestPossibleDueDate(
      {
        ...cfg,
        startDate: getWorklogStr(startDate),
      },
      today,
    ),
  ).toEqual(expected);
};

describe('getNewestPossibleDueDate()', () => {
  describe('DAILY', () => {
    const testCases = [
      {
        description: 'should return today date if today is due day',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
        }),
        today: dateStrToUtcDate('2022-02-11'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: dateStrToUtcDate('2022-02-11'),
      },
      {
        description: 'should return date if today is after due',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          lastTaskCreation: dateStrToUtcDate('2022-01-14').getTime(),
        }),
        startDate: dateStrToUtcDate('2022-01-14'),
        today: dateStrToUtcDate('2022-03-14'),
        expectedDate: dateStrToUtcDate('2022-03-14'),
      },
      {
        description: 'should work for repeat every 1',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 3,
          lastTaskCreation: dateStrToUtcDate('2022-01-14').getTime(),
        }),
        startDate: dateStrToUtcDate('2022-01-14'),
        today: dateStrToUtcDate('2022-03-14'),
        expectedDate: dateStrToUtcDate('2022-03-12'),
      },
      {
        description: 'should return null if today and already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          lastTaskCreation: dateStrToUtcDate('2022-01-14').getTime(),
        }),
        today: dateStrToUtcDate('2022-01-14'),
        startDate: dateStrToUtcDate('2022-01-14'),
        expectedDate: null,
      },
      {
        description: 'should return null if last applicable is already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 5,
          lastTaskCreation: dateStrToUtcDate('2022-01-15').getTime(),
        }),
        today: dateStrToUtcDate('2022-01-17'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: null,
      },
    ];

    testCases.forEach(
      ({ description, startDate, taskRepeatCfg, today, expectedDate }) => {
        it(description, () => {
          testCase(taskRepeatCfg, today, startDate, expectedDate);
        });
      },
    );
  });

  describe('WEEKLY', () => {
    const testCases = [
      {
        // 1-10-22 is a monday
        description: 'should return today date if today is due day',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
          monday: true,
        }),
        today: dateStrToUtcDate('2022-01-17'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: dateStrToUtcDate('2022-01-17'),
      },
      {
        // 1-10-22 is a monday
        description: 'should return null if no weekday is set',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
        }),
        today: dateStrToUtcDate('2022-01-17'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: null,
      },
      {
        description: 'should work also if there is a weird lastTaskCreation date',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-16').getTime(),
          monday: true,
        }),
        today: dateStrToUtcDate('2022-01-17'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: dateStrToUtcDate('2022-01-17'),
      },
      {
        description: 'should return date for the proper weekday',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-07').getTime(),
          friday: true,
        }),
        // is a friday
        startDate: dateStrToUtcDate('2022-01-07'),
        today: dateStrToUtcDate('2022-03-24'),
        // is a friday
        expectedDate: dateStrToUtcDate('2022-03-18'),
      },
      {
        description: 'should work for repeat every 1',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 2,
          lastTaskCreation: dateStrToUtcDate('2022-01-03').getTime(),
          monday: true,
        }),
        // monday
        startDate: dateStrToUtcDate('2022-01-03'),
        today: dateStrToUtcDate('2022-01-24'),
        expectedDate: dateStrToUtcDate('2022-01-17'),
      },
      {
        description: 'should work for repeat every 2',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 2,
          lastTaskCreation: dateStrToUtcDate('2022-01-03').getTime(),
          monday: true,
          tuesday: true,
        }),
        // monday
        startDate: dateStrToUtcDate('2022-01-03'),
        today: dateStrToUtcDate('2022-01-24'),
        expectedDate: dateStrToUtcDate('2022-01-18'),
      },
      {
        description: 'should return null if today and already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
          monday: true,
        }),
        today: dateStrToUtcDate('2022-01-10'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: null,
      },
      {
        description: 'should return null if last applicable is already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 2,
          monday: true,
          lastTaskCreation: dateStrToUtcDate('2022-01-17').getTime(),
        }),
        today: dateStrToUtcDate('2022-01-27'),
        startDate: dateStrToUtcDate('2022-01-03'),
        expectedDate: null,
      },
      {
        description: 'should return last week if last week was due and not set',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: 0,
          monday: true,
        }),
        today: new Date(FAKE_MONDAY_THE_10TH - DAY),
        startDate: new Date(FAKE_MONDAY_THE_10TH - DAY * 14),
        expectedDate: new Date(FAKE_MONDAY_THE_10TH - DAY * 7),
      },
      {
        description:
          'should return last week if last week was due and last creation is long ago',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: FAKE_MONDAY_THE_10TH + DAY * 7,
          monday: true,
        }),
        startDate: new Date(FAKE_MONDAY_THE_10TH),
        today: new Date(FAKE_MONDAY_THE_10TH + DAY * 7 * 29 + DAY * 3),
        expectedDate: new Date(FAKE_MONDAY_THE_10TH + DAY * 7 * 29),
      },
      {
        description: 'should return NULL if not applicable',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 5,
          lastTaskCreation: FAKE_MONDAY_THE_10TH + DAY * (7 * 5 + 0),
          monday: true,
        }),
        startDate: new Date(FAKE_MONDAY_THE_10TH),
        today: new Date(FAKE_MONDAY_THE_10TH + DAY * (5 * 7 + 7)),
        expectedDate: null,
      },
      {
        description: 'should return NULL if start date is in the future',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: FAKE_MONDAY_THE_10TH - DAY * 7,
          monday: true,
        }),
        startDate: new Date(FAKE_MONDAY_THE_10TH),
        today: new Date(FAKE_MONDAY_THE_10TH - 1 * DAY),
        expectedDate: null,
      },
      {
        description: 'should respect start date is in the future',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          lastTaskCreation: FAKE_MONDAY_THE_10TH - DAY * 7,
          monday: true,
          tuesday: true,
          wednesday: true,
        }),
        startDate: new Date(FAKE_MONDAY_THE_10TH + 4 * DAY),
        today: new Date(FAKE_MONDAY_THE_10TH + 1 * DAY),
        expectedDate: null,
      },
    ];

    testCases.forEach(
      ({ description, taskRepeatCfg, startDate, today, expectedDate }) => {
        it(description, () => {
          testCase(taskRepeatCfg, today, startDate, expectedDate);
        });
      },
    );
  });

  describe('MONTHLY', () => {
    const testCases = [
      {
        description: 'should return today date if today is due day',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
        }),
        today: dateStrToUtcDate('2022-02-10'),
        startDate: dateStrToUtcDate('2022-01-10'),
        expectedDate: dateStrToUtcDate('2022-02-10'),
      },
      {
        description: 'should return date if today is after due',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 3,
          lastTaskCreation: dateStrToUtcDate('2022-01-14').getTime(),
        }),
        today: dateStrToUtcDate('2022-08-14'),
        startDate: dateStrToUtcDate('2022-01-14'),
        expectedDate: dateStrToUtcDate('2022-07-14'),
      },
      {
        description: 'should return null if last applicable is already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 3,
          lastTaskCreation: dateStrToUtcDate('2022-07-14').getTime(),
        }),
        today: dateStrToUtcDate('2022-08-14'),
        startDate: dateStrToUtcDate('2022-01-14'),
        expectedDate: null,
      },
      {
        description: "should not return values for marco's edge case",
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-06-26').getTime(),
        }),
        today: dateStrToUtcDate('2024-07-16'),
        startDate: dateStrToUtcDate('2024-01-26'),
        expectedDate: null,
      },
    ];

    testCases.forEach(
      ({ description, startDate, taskRepeatCfg, today, expectedDate }) => {
        it(description, () => {
          if (expectedDate) {
            expectedDate.setHours(0, 0, 0, 0);
          }
          testCase(taskRepeatCfg, today, startDate, expectedDate);
        });
      },
    );
  });

  describe('YEARLY', () => {
    const testCases = [
      {
        description: 'should return date if applicable',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          lastTaskCreation: FAKE_MONDAY_THE_10TH,
        }),
        today: new Date(FAKE_MONDAY_THE_10TH + DAY * 366),
        startDate: FAKE_MONDAY_THE_10TH,
        expectedDate: new Date(FAKE_MONDAY_THE_10TH + DAY * 365),
      },
      {
        description: 'should return null if not applicable',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 2,
          lastTaskCreation: FAKE_MONDAY_THE_10TH,
        }),
        today: new Date(FAKE_MONDAY_THE_10TH + DAY * 365),
        startDate: FAKE_MONDAY_THE_10TH,
        expectedDate: null,
      },
      {
        description: 'should return date if applicable 2',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 2,
          lastTaskCreation: FAKE_MONDAY_THE_10TH,
        }),
        today: new Date(FAKE_MONDAY_THE_10TH + DAY * 365 * 3),
        startDate: FAKE_MONDAY_THE_10TH,
        expectedDate: new Date(FAKE_MONDAY_THE_10TH + DAY * 365 * 2),
      },
      {
        description: 'should return date if applicable 3',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 3,
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
        }),
        today: dateStrToUtcDate('2026-01-10'),
        startDate: FAKE_MONDAY_THE_10TH,
        expectedDate: dateStrToUtcDate('2025-01-10'),
      },
      {
        description: 'should return null if NOT applicable',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 2,
          lastTaskCreation: dateStrToUtcDate('2022-01-10').getTime(),
        }),
        today: dateStrToUtcDate('2023-01-10'),
        startDate: dateStrToUtcDate('2022-01-10').getTime(),
        expectedDate: null,
      },
      {
        description: 'should not return values for Marco`s edge case for year',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-01-26').getTime(),
        }),
        today: dateStrToUtcDate('2024-07-16'),
        startDate: dateStrToUtcDate('2023-01-26'),
        expectedDate: null,
      },
      {
        description: 'should not return values for Marco`s edge case for year 2',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-01-26').getTime(),
        }),
        today: dateStrToUtcDate('2024-05-27'),
        startDate: dateStrToUtcDate('2023-01-26'),
        expectedDate: null,
      },
    ];

    testCases.forEach(
      ({ description, startDate, taskRepeatCfg, today, expectedDate }) => {
        it(description, () => {
          if (expectedDate) {
            expectedDate.setHours(0, 0, 0, 0);
          }
          testCase(taskRepeatCfg, today, startDate, expectedDate);
        });
      },
    );
  });
});
