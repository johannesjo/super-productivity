import { getNewestPossibleDueDate } from './get-newest-possible-due-date.util';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getWorklogStr } from '../../../util/get-work-log-str';

// eslint-disable-file no-mixed-operators

const FAKE_MONDAY_THE_10TH = new Date('2022-01-10').getTime();

const DUMMY_REPEATABLE_TASK: TaskRepeatCfg = {
  ...DEFAULT_TASK_REPEAT_CFG,
  id: 'REPEATABLE_DEFAULT',
  title: 'REPEATABLE_DEFAULT',
  quickSetting: 'DAILY',
  lastTaskCreation: 60 * 60 * 1000,
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
      // eslint-disable-next-line no-mixed-operators
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
});
