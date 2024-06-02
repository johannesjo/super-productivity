import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

/* eslint-disable no-mixed-operators */

const FAKE_MONDAY_THE_10TH = new Date('2022-01-10').getTime();

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
          lastTaskCreation: new Date('2022-01-10').getTime(),
        }),
        today: new Date('2022-02-11'),
        startDate: new Date('2022-01-10'),
        expectedDate: new Date('2022-02-11'),
      },
      {
        description: 'should return date if today is after due',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          lastTaskCreation: new Date('2022-01-14').getTime(),
        }),
        startDate: new Date('2022-01-14'),
        today: new Date('2022-03-14'),
        expectedDate: new Date('2022-03-14'),
      },
      {
        description: 'should work for repeat every 1',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 3,
          lastTaskCreation: new Date('2022-01-14').getTime(),
        }),
        startDate: new Date('2022-01-14'),
        today: new Date('2022-03-14'),
        expectedDate: new Date('2022-03-12'),
      },
      {
        description: 'should return null if today and already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          lastTaskCreation: new Date('2022-01-14').getTime(),
        }),
        today: new Date('2022-01-14'),
        startDate: new Date('2022-01-14'),
        expectedDate: null,
      },
      {
        description: 'should return null if last applicable is already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 5,
          lastTaskCreation: new Date('2022-01-15').getTime(),
        }),
        today: new Date('2022-01-17'),
        startDate: new Date('2022-01-10'),
        expectedDate: null,
      },
    ];

    testCases.forEach(
      ({ description, startDate, taskRepeatCfg, today, expectedDate }) => {
        it(description, () => {
          if (expectedDate) {
          }
          testCase(taskRepeatCfg, today, startDate, expectedDate);
        });
      },
    );
  });

  describe('WEEKLY', () => {
    it('should return last week if last week was due and not set', () => {
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        lastTaskCreation: 0,
      });
      const today = new Date(FAKE_MONDAY_THE_10TH);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH - DAY * 7);
      testCase(taskRepeatCfg, today, FAKE_MONDAY_THE_10TH - DAY * 7, expectedDate);
    });

    it('should return last week if last week was due and last creation is long ago', () => {
      const START = FAKE_MONDAY_THE_10TH;
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        lastTaskCreation: START + DAY * 7,
      });
      const today = new Date(START + DAY * 7 * 29 + DAY * 3);
      const expectedDate = new Date(START + DAY * 7 * 29);
      testCase(taskRepeatCfg, today, START, expectedDate);
    });

    it('should return NULL if not applicable', () => {
      const repeatEvery = 5;
      const START = FAKE_MONDAY_THE_10TH;
      const LAST_CREATION = START + DAY * (7 * repeatEvery + 0);
      const TODAY = START + DAY * (repeatEvery * 7 + 7);
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery,
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      testCase(taskRepeatCfg, today, START, null);
    });

    it('should return NULL if start data is in the future', () => {
      const START = FAKE_MONDAY_THE_10TH;
      const today = new Date(START - 1 * DAY);
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        lastTaskCreation: START - DAY * 7,
      });
      testCase(taskRepeatCfg, today, START, null);
    });
  });

  describe('MONTHLY', () => {
    const testCases = [
      {
        description: 'should return today date if today is due day',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          lastTaskCreation: new Date('2022-01-10').getTime(),
        }),
        today: new Date('2022-02-10'),
        startDate: new Date('2022-01-10'),
        expectedDate: new Date('2022-02-10'),
      },
      {
        description: 'should return date if today is after due',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 3,
          lastTaskCreation: new Date('2022-01-14').getTime(),
        }),
        today: new Date('2022-08-14'),
        startDate: new Date('2022-01-14'),
        expectedDate: new Date('2022-07-14'),
      },
      {
        description: 'should return null if last applicable is already created',
        taskRepeatCfg: dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 3,
          lastTaskCreation: new Date('2022-07-14').getTime(),
        }),
        today: new Date('2022-08-14'),
        startDate: new Date('2022-01-14'),
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
          lastTaskCreation: new Date('2022-01-10').getTime(),
        }),
        today: new Date('2026-01-10'),
        startDate: FAKE_MONDAY_THE_10TH,
        expectedDate: new Date('2025-01-10'),
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
