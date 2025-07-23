import { getNextRepeatOccurrence } from './get-next-repeat-occurrence.util';
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
  fromDate: Date,
  startDate: Date | number,
  expected: Date | null,
): void => {
  if (expected) {
    expected.setHours(12, 0, 0, 0);
  }

  expect(
    getNextRepeatOccurrence(
      {
        ...cfg,
        startDate: getWorklogStr(startDate),
      },
      fromDate,
    ),
  ).toEqual(expected);
};

describe('getNextRepeatOccurrence()', () => {
  describe('Input validation', () => {
    it('should throw error if startDate is not defined', () => {
      const cfg = dummyRepeatable('ID1', {
        startDate: undefined as any,
      });
      expect(() => getNextRepeatOccurrence(cfg, new Date())).toThrowError(
        'Repeat startDate needs to be defined',
      );
    });

    it('should throw error if repeatEvery is not a positive integer', () => {
      const cfg1 = dummyRepeatable('ID1', {
        repeatEvery: 0,
      });
      expect(() => getNextRepeatOccurrence(cfg1, new Date())).toThrowError(
        'Invalid repeatEvery value given',
      );

      const cfg2 = dummyRepeatable('ID1', {
        repeatEvery: -1,
      });
      expect(() => getNextRepeatOccurrence(cfg2, new Date())).toThrowError(
        'Invalid repeatEvery value given',
      );

      const cfg3 = dummyRepeatable('ID1', {
        repeatEvery: 1.5,
      });
      expect(() => getNextRepeatOccurrence(cfg3, new Date())).toThrowError(
        'Invalid repeatEvery value given',
      );
    });
  });

  describe('DAILY', () => {
    it('should return tomorrow for daily task created today', () => {
      const today = new Date('2022-01-10');
      const tomorrow = new Date('2022-01-11');
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        lastTaskCreation: today.getTime(),
      });
      testCase(cfg, today, today, tomorrow);
    });

    it('should return correct date for every 2 days pattern', () => {
      const startDate = new Date('2022-01-10');
      const lastCreation = new Date('2022-01-10');
      const fromDate = new Date('2022-01-11');
      const expected = new Date('2022-01-12');
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 2,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should skip to next occurrence if last creation was in the past', () => {
      const startDate = new Date('2022-01-01');
      const lastCreation = new Date('2022-01-05');
      const fromDate = new Date('2022-01-10');
      const expected = new Date('2022-01-11'); // Next daily occurrence after Jan 10
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle every 3 days pattern correctly', () => {
      const startDate = new Date('2022-01-01'); // Saturday
      const lastCreation = new Date('2022-01-10'); // Monday (day 9 from start)
      const fromDate = new Date('2022-01-11');
      const expected = new Date('2022-01-13'); // Thursday (day 12 from start)
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 3,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });
  });

  describe('WEEKLY', () => {
    it('should return next week for weekly task on same weekday', () => {
      const startDate = new Date('2022-01-10'); // Monday
      const lastCreation = new Date('2022-01-10');
      const fromDate = new Date('2022-01-11');
      const expected = new Date('2022-01-17'); // Next Monday
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        monday: true,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should return correct day for multiple weekdays pattern', () => {
      const startDate = new Date('2022-01-10'); // Monday
      const lastCreation = new Date('2022-01-10');
      const fromDate = new Date('2022-01-11'); // Tuesday
      const expected = new Date('2022-01-12'); // Wednesday
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        monday: true,
        wednesday: true,
        friday: true,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle every 2 weeks pattern', () => {
      const startDate = new Date('2022-01-03'); // Monday Jan 3
      const lastCreation = new Date('2022-01-17'); // Monday Jan 17 (2 weeks later)
      const fromDate = new Date('2022-01-18');
      const expected = new Date('2022-01-31'); // Monday Jan 31 (2 weeks after Jan 17)
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 2,
        monday: true,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should find next valid weekday in current week', () => {
      const startDate = new Date('2022-01-10'); // Monday
      const lastCreation = new Date('2022-01-10');
      const fromDate = new Date('2022-01-10'); // Still Monday
      const expected = new Date('2022-01-11'); // Tuesday
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        tuesday: true,
        thursday: true,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });
  });

  describe('MONTHLY', () => {
    it('should return same day next month for monthly task', () => {
      const startDate = new Date('2022-01-15');
      const lastCreation = new Date('2022-01-15');
      const fromDate = new Date('2022-01-16');
      const expected = new Date('2022-02-15');
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle end-of-month dates correctly', () => {
      const startDate = new Date('2022-01-31');
      const lastCreation = new Date('2022-01-31');
      const fromDate = new Date('2022-02-01');
      const expected = new Date('2022-02-28'); // Feb doesn't have 31 days
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle every 2 months pattern', () => {
      const startDate = new Date('2022-01-15');
      const lastCreation = new Date('2022-01-15');
      const fromDate = new Date('2022-01-16');
      const expected = new Date('2022-03-15'); // 2 months later
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 2,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle leap year correctly', () => {
      const startDate = new Date('2024-01-31');
      const lastCreation = new Date('2024-01-31');
      const fromDate = new Date('2024-02-01');
      const expected = new Date('2024-02-29'); // Leap year
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'MONTHLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });
  });

  describe('YEARLY', () => {
    it('should return same date next year for yearly task', () => {
      const startDate = new Date('2022-03-15');
      const lastCreation = new Date('2022-03-15');
      const fromDate = new Date('2022-03-16');
      const expected = new Date('2023-03-15');
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'YEARLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle every 2 years pattern', () => {
      const startDate = new Date('2022-03-15');
      const lastCreation = new Date('2022-03-15');
      const fromDate = new Date('2022-03-16');
      const expected = new Date('2024-03-15'); // 2 years later
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'YEARLY',
        repeatEvery: 2,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should handle leap year date (Feb 29)', () => {
      const startDate = new Date('2024-02-29');
      const lastCreation = new Date('2024-02-29');
      const fromDate = new Date('2024-03-01');
      const expected = new Date('2025-02-28'); // Non-leap year
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'YEARLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should return this year if date hasnt passed yet', () => {
      const startDate = new Date('2021-12-25');
      const lastCreation = new Date('2021-12-25');
      const fromDate = new Date('2022-01-01');
      const expected = new Date('2022-12-25'); // This year
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'YEARLY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });
  });

  describe('Edge cases', () => {
    it('should return null for unknown repeat cycle', () => {
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'UNKNOWN' as any,
        lastTaskCreation: FAKE_MONDAY_THE_10TH,
      });
      expect(getNextRepeatOccurrence(cfg, new Date())).toBeNull();
    });

    it('should handle when fromDate is before lastTaskCreation', () => {
      const startDate = new Date('2022-01-01');
      const lastCreation = new Date('2022-01-15');
      const fromDate = new Date('2022-01-10'); // Before last creation
      const expected = new Date('2022-01-16'); // Day after last creation
      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        lastTaskCreation: lastCreation.getTime(),
      });
      testCase(cfg, fromDate, startDate, expected);
    });

    it('should use default fromDate (today) when not provided', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const cfg = dummyRepeatable('ID1', {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        lastTaskCreation: today.getTime() - DAY, // Yesterday
        startDate: getWorklogStr(today.getTime() - DAY),
      });

      const result = getNextRepeatOccurrence(cfg);
      expect(result).toBeTruthy();
      // Should be today or later
      expect(result!.getTime()).toBeGreaterThanOrEqual(today.getTime());
    });
  });
});
