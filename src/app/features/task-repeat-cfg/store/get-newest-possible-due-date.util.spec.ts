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
    it('should return yesterday if yesterday was due and not set', () => {
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        lastTaskCreation: 0,
      });
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      const startDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setDate(today.getDate() - 1);
      testCase(taskRepeatCfg, today, startDate, expectedDate);
    });

    it('should return yesterday if yesterday was due and last creation is ages ago', () => {
      const START = FAKE_MONDAY_THE_10TH - DAY * 31;

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        lastTaskCreation: START + DAY * 3,
      });
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setDate(today.getDate() - 1);
      testCase(taskRepeatCfg, today, START, expectedDate);
    });

    it('should return NULL if not applicable', () => {
      const repeatEvery = 7;
      const START = FAKE_MONDAY_THE_10TH;
      const LAST_CREATION = START + DAY * repeatEvery;
      const TODAY = START + DAY * (repeatEvery + 2);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      testCase(taskRepeatCfg, today, START, null);
    });

    it('should return NULL if not applicable 2', () => {
      const repeatEvery = 7;
      const START = FAKE_MONDAY_THE_10TH;
      const LAST_CREATION = START + DAY * repeatEvery * 2;
      const TODAY = START + DAY * (repeatEvery * 2 + 6);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      testCase(taskRepeatCfg, today, START, null);
    });

    it('should return date  if applicable', () => {
      const repeatEvery = 7;
      const START = FAKE_MONDAY_THE_10TH;
      const LAST_CREATION = START + DAY * repeatEvery * 2;
      const TODAY = START + DAY * (repeatEvery * 3 + 1);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      testCase(taskRepeatCfg, today, START, new Date(START + DAY * 21));
    });
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
    it('should return date if applicable ', () => {
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 32);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH + DAY * 31);
      expectedDate.setHours(0, 0, 0, 0);
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        lastTaskCreation: startDateDate.getTime(),
      });
      testCase(taskRepeatCfg, today, startDateDate, expectedDate);
    });

    it('should return null if not applicable', () => {
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 31);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 2,
        lastTaskCreation: startDateDate.getTime(),
      });
      testCase(taskRepeatCfg, today, startDateDate, null);
    });

    it('should return date if applicable 2', () => {
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 94);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setMonth(2);
      expectedDate.setHours(0, 0, 0, 0);
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 2,
        lastTaskCreation: startDateDate.getTime(),
      });
      testCase(taskRepeatCfg, today, startDateDate, expectedDate);
    });
  });
});
