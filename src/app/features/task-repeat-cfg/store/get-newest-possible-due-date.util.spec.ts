import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

/* eslint-disable-file no-mixed-operators */

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

describe('getNewestPossibleDueDate()', () => {
  describe('DAILY', () => {
    it('should return yesterday if yesterday was due and not set', () => {
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        lastTaskCreation: 0,
        startDate: getWorklogStr(FAKE_MONDAY_THE_10TH),
      });
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setDate(today.getDate() - 1);

      expect(getNewestPossibleDueDate(taskRepeatCfg, today)?.getTime()).toEqual(
        expectedDate.getTime(),
      );
    });

    it('should return yesterday if yesterday was due and last creation is ages ago', () => {
      // eslint-disable-next-line no-mixed-operators
      const START = FAKE_MONDAY_THE_10TH - DAY * 31;

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: START + DAY * 3,
      });
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY);
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setDate(today.getDate() - 1);

      expect(getNewestPossibleDueDate(taskRepeatCfg, today)?.getTime()).toEqual(
        expectedDate.getTime(),
      );
    });

    it('should return NULL if not applicable', () => {
      const repeatEvery = 7;
      const START = FAKE_MONDAY_THE_10TH;
      // eslint-disable-next-line no-mixed-operators
      const LAST_CREATION = START + DAY * repeatEvery;
      // eslint-disable-next-line no-mixed-operators
      const TODAY = START + DAY * (repeatEvery + 2);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(null);
    });

    it('should return NULL if not applicable 2', () => {
      const repeatEvery = 7;
      // eslint-disable-next-line no-mixed-operators
      const START = FAKE_MONDAY_THE_10TH;
      // eslint-disable-next-line no-mixed-operators
      const LAST_CREATION = START + DAY * repeatEvery * 2;
      // eslint-disable-next-line no-mixed-operators
      const TODAY = START + DAY * (repeatEvery * 2 + 6);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(null);
    });

    it('should return date  if applicable', () => {
      const repeatEvery = 7;
      // eslint-disable-next-line no-mixed-operators
      const START = FAKE_MONDAY_THE_10TH;
      // eslint-disable-next-line no-mixed-operators
      const LAST_CREATION = START + DAY * repeatEvery * 2;
      // eslint-disable-next-line no-mixed-operators
      const TODAY = START + DAY * (repeatEvery * 3 + 1);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)?.getDate()).toEqual(31);
    });
  });

  describe('WEEKLY', () => {
    it('should return last week if last week was due and not set', () => {
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        lastTaskCreation: 0,
        // eslint-disable-next-line no-mixed-operators
        startDate: getWorklogStr(FAKE_MONDAY_THE_10TH - DAY * 7),
      });
      const today = new Date(FAKE_MONDAY_THE_10TH);
      // eslint-disable-next-line no-mixed-operators
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH - DAY * 7);

      expect(getNewestPossibleDueDate(taskRepeatCfg, today)?.getTime()).toEqual(
        expectedDate.getTime(),
      );
    });

    it('should return last week if last week was due and last creation is long ago', () => {
      // eslint-disable-next-line no-mixed-operators
      const START = FAKE_MONDAY_THE_10TH;

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: START + DAY * 7,
      });
      // eslint-disable-next-line no-mixed-operators
      const today = new Date(START + DAY * 7 * 29 + DAY * 3);
      // eslint-disable-next-line no-mixed-operators
      const expectedDate = new Date(START + DAY * 7 * 29);

      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(expectedDate);
    });

    it('should return NULL if not applicable', () => {
      const repeatEvery = 5;
      const START = FAKE_MONDAY_THE_10TH;
      // eslint-disable-next-line no-mixed-operators
      const LAST_CREATION = START + DAY * (7 * repeatEvery + 0);
      // eslint-disable-next-line no-mixed-operators
      const TODAY = START + DAY * (repeatEvery * 7 + 7);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery,
        startDate: getWorklogStr(START),
        lastTaskCreation: LAST_CREATION,
      });
      const today = new Date(TODAY);
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(null);
    });

    it('should return NULL if start data is in the future', () => {
      const START = FAKE_MONDAY_THE_10TH;
      // eslint-disable-next-line no-mixed-operators
      const today = new Date(START - 1 * DAY);
      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        startDate: getWorklogStr(START),
        // eslint-disable-next-line no-mixed-operators
        lastTaskCreation: START - DAY * 7,
      });
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(null);
    });
  });

  describe('MONTHLY', () => {
    it('should return date if applicable ', () => {
      // eslint-disable-next-line no-mixed-operators
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const startDate = getWorklogStr(startDateDate);
      // eslint-disable-next-line no-mixed-operators
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 32);
      // eslint-disable-next-line no-mixed-operators
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH + DAY * 31);
      expectedDate.setHours(0, 0, 0, 0);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 1,
        lastTaskCreation: startDateDate.getTime(),
        startDate,
      });
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(expectedDate);
    });

    it('should return null if not applicable', () => {
      // eslint-disable-next-line no-mixed-operators
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const startDate = getWorklogStr(startDateDate);
      // eslint-disable-next-line no-mixed-operators
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 31);
      // eslint-disable-next-line no-mixed-operators

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 2,
        lastTaskCreation: startDateDate.getTime(),
        startDate,
      });
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(null);
    });

    it('should return date if applicable 2', () => {
      // eslint-disable-next-line no-mixed-operators
      const startDateDate = new Date(FAKE_MONDAY_THE_10TH);
      const startDate = getWorklogStr(startDateDate);
      // eslint-disable-next-line no-mixed-operators
      const today = new Date(FAKE_MONDAY_THE_10TH + DAY * 94);
      // eslint-disable-next-line no-mixed-operators
      const expectedDate = new Date(FAKE_MONDAY_THE_10TH);
      expectedDate.setMonth(2);
      expectedDate.setHours(0, 0, 0, 0);

      const taskRepeatCfg: TaskRepeatCfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 2,
        lastTaskCreation: startDateDate.getTime(),
        startDate,
      });
      expect(getNewestPossibleDueDate(taskRepeatCfg, today)).toEqual(expectedDate);
    });
  });
});
