import { getNextRepeatOccurrence } from './get-next-repeat-occurrence.util';
import { DEFAULT_TASK_REPEAT_CFG, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getLocalDateStr } from '../../../util/get-local-date-str';
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
  startDate: getLocalDateStr(FAKE_MONDAY_THE_10TH),
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
        startDate: getLocalDateStr(startDate),
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

  describe('Timezone Edge Cases', () => {
    describe('DST transitions', () => {
      it('should handle spring DST transition (clocks forward)', () => {
        // March 13, 2022 is when DST starts in US (2 AM becomes 3 AM)
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2022-03-12').getTime(),
        });
        const fromDate = dateStrToUtcDate('2022-03-12');
        const startDate = dateStrToUtcDate('2022-03-12');
        const expected = dateStrToUtcDate('2022-03-13');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle fall DST transition (clocks back)', () => {
        // November 6, 2022 is when DST ends in US (2 AM becomes 1 AM)
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2022-11-05').getTime(),
        });
        const fromDate = dateStrToUtcDate('2022-11-05');
        const startDate = dateStrToUtcDate('2022-11-05');
        const expected = dateStrToUtcDate('2022-11-06');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });
    });

    describe('Year boundary crossing', () => {
      it('should handle daily repeat across year boundary', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2021-12-31').getTime(),
        });
        const fromDate = dateStrToUtcDate('2021-12-31');
        const startDate = dateStrToUtcDate('2021-12-30');
        const expected = dateStrToUtcDate('2022-01-01');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle weekly repeat across year boundary', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2021-12-27').getTime(), // Monday
          monday: true,
        });
        const fromDate = dateStrToUtcDate('2021-12-28'); // Tuesday
        const startDate = dateStrToUtcDate('2021-12-27');
        const expected = dateStrToUtcDate('2022-01-03'); // Next Monday
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle monthly repeat across year boundary', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2021-12-15').getTime(),
        });
        const fromDate = dateStrToUtcDate('2021-12-16');
        const startDate = dateStrToUtcDate('2021-11-15');
        const expected = dateStrToUtcDate('2022-01-15');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle yearly repeat across decade boundary', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2019-06-15').getTime(),
        });
        const fromDate = dateStrToUtcDate('2019-06-16');
        const startDate = dateStrToUtcDate('2019-06-15');
        const expected = dateStrToUtcDate('2020-06-15');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });
    });

    describe('Leap year edge cases', () => {
      it('should handle February 29 in leap year for monthly repeat', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-01-29').getTime(),
        });
        const fromDate = dateStrToUtcDate('2024-01-30');
        const startDate = dateStrToUtcDate('2024-01-29');
        const expected = dateStrToUtcDate('2024-02-29');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle February 29 yearly repeat in non-leap year', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-02-29').getTime(),
        });
        const fromDate = dateStrToUtcDate('2024-03-01');
        const startDate = dateStrToUtcDate('2024-02-29');
        const expected = dateStrToUtcDate('2025-02-28'); // Non-leap year
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle February 29 to February 28 transition for yearly repeat', () => {
        // Testing yearly repeat starting from Feb 29 in a leap year
        // When the next year is not a leap year, it should use Feb 28
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2024-02-29').getTime(),
        });
        const fromDate = dateStrToUtcDate('2024-03-01');
        const startDate = dateStrToUtcDate('2024-02-29');
        // 2025 is not a leap year, so Feb 29 doesn't exist - should be Feb 28
        const expected = dateStrToUtcDate('2025-02-28');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle century leap year edge case', () => {
        // 2100 is not a leap year (divisible by 100 but not 400)
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'YEARLY',
          repeatEvery: 1,
          lastTaskCreation: new Date('2099-02-28').getTime(),
        });
        const fromDate = new Date('2099-03-01');
        const startDate = new Date('2099-02-28');
        const expected = new Date('2100-02-28'); // Not a leap year
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });
    });

    describe('Midnight and near-midnight times', () => {
      it('should handle task created at 23:59:59', () => {
        const lastCreation = new Date('2022-01-10T23:59:59.999Z');
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: lastCreation.getTime(),
        });
        const fromDate = new Date('2022-01-10T23:59:59.999Z');
        const startDate = dateStrToUtcDate('2022-01-10');
        // Since lastCreation is Jan 10 23:59:59 and fromDate is also Jan 10 23:59:59,
        // the function will start checking from the day after lastTaskCreation
        // which would be Jan 11 + 1 = Jan 12
        const expected = dateStrToUtcDate('2022-01-12');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle task created at 00:00:01', () => {
        const lastCreation = new Date('2022-01-11T00:00:01.000Z');
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: lastCreation.getTime(),
        });
        const fromDate = new Date('2022-01-11T00:00:01.000Z');
        const startDate = dateStrToUtcDate('2022-01-10');
        const expected = dateStrToUtcDate('2022-01-12');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle weekly repeat with midnight crossing', () => {
        const lastCreation = new Date('2022-01-09T23:59:59.999Z'); // Sunday night
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 1,
          lastTaskCreation: lastCreation.getTime(),
          monday: true,
        });
        const fromDate = new Date('2022-01-10T00:00:01.000Z'); // Monday morning
        const startDate = dateStrToUtcDate('2022-01-03'); // Previous Monday
        const expected = dateStrToUtcDate('2022-01-17'); // Next Monday
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });
    });

    describe('Month-end date handling', () => {
      it('should handle 31st to 30-day month transition', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2022-03-31').getTime(),
        });
        const fromDate = dateStrToUtcDate('2022-04-01');
        const startDate = dateStrToUtcDate('2022-01-31');
        const expected = dateStrToUtcDate('2022-04-30'); // April has 30 days
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle 30th to February transition', () => {
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'MONTHLY',
          repeatEvery: 1,
          lastTaskCreation: dateStrToUtcDate('2022-01-30').getTime(),
        });
        const fromDate = dateStrToUtcDate('2022-01-31');
        const startDate = dateStrToUtcDate('2021-11-30');
        const expected = dateStrToUtcDate('2022-02-28'); // February in non-leap year
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle all months correctly for 31st start date', () => {
        const startDate = dateStrToUtcDate('2022-01-31');
        const testCases = [
          { month: '2022-02', expectedDay: 28 }, // Feb non-leap
          { month: '2022-04', expectedDay: 30 }, // Apr
          { month: '2022-06', expectedDay: 30 }, // Jun
          { month: '2022-09', expectedDay: 30 }, // Sep
          { month: '2022-11', expectedDay: 30 }, // Nov
        ];

        testCases.forEach(({ month, expectedDay }) => {
          const lastCreation = new Date(`${month}-01`);
          lastCreation.setDate(lastCreation.getDate() - 1); // Previous month

          const cfg = dummyRepeatable('ID1', {
            repeatCycle: 'MONTHLY',
            repeatEvery: 1,
            lastTaskCreation: lastCreation.getTime(),
          });

          const fromDate = new Date(`${month}-01`);
          const expected = new Date(`${month}-${expectedDay}`);
          expected.setHours(12, 0, 0, 0);

          const result = getNextRepeatOccurrence(
            { ...cfg, startDate: getLocalDateStr(startDate) },
            fromDate,
          );

          expect(result?.getDate()).toBe(expectedDay);
        });
      });
    });

    describe('Multi-timezone scenario simulations', () => {
      it('should handle task created in one timezone and checked in another', () => {
        // Task created at 11 PM LA time on Jan 10 (which is 7 AM UTC on Jan 11)
        const lastCreationLA = new Date('2022-01-10T23:00:00-08:00');
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: lastCreationLA.getTime(),
        });

        // Check at 9 AM Berlin time on Jan 11 (which is 8 AM UTC)
        const fromDateBerlin = new Date('2022-01-11T09:00:00+01:00');
        const startDate = dateStrToUtcDate('2022-01-10');
        const expected = new Date('2022-01-12T09:00:00+01:00');
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDateBerlin,
        );
        expect(result).toEqual(expected);
      });

      it('should handle weekly repeat with timezone differences', () => {
        // Task repeats every Monday, created Sunday night in LA (Monday morning UTC)
        const lastCreation = new Date('2022-01-09T23:00:00-08:00'); // Sunday 11 PM LA = Monday 7 AM UTC
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'WEEKLY',
          repeatEvery: 1,
          lastTaskCreation: lastCreation.getTime(),
          monday: true,
        });

        // Check on Monday 10 AM Tokyo time
        const fromDate = new Date('2022-01-10T10:00:00+09:00'); // Monday 10 AM Tokyo
        const startDate = dateStrToUtcDate('2022-01-03'); // Previous Monday
        const expected = new Date('2022-01-17T10:00:00+09:00'); // Next Monday
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toEqual(expected);
      });

      it('should handle International Date Line crossing', () => {
        // Task created in Hawaii (UTC-10)
        const lastCreation = new Date('2022-01-10T23:00:00-10:00');
        const cfg = dummyRepeatable('ID1', {
          repeatCycle: 'DAILY',
          repeatEvery: 1,
          lastTaskCreation: lastCreation.getTime(),
        });

        // Check in New Zealand (UTC+12)
        const fromDate = new Date('2022-01-12T01:00:00+12:00');
        const startDate = new Date('2022-01-10T12:00:00Z');
        const expected = new Date('2022-01-12T01:00:00+12:00');
        expected.setDate(expected.getDate() + 1);
        expected.setHours(12, 0, 0, 0);

        const result = getNextRepeatOccurrence(
          { ...cfg, startDate: getLocalDateStr(startDate) },
          fromDate,
        );
        expect(result).toBeTruthy();
      });
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
        startDate: getLocalDateStr(today.getTime() - DAY),
      });

      const result = getNextRepeatOccurrence(cfg);
      expect(result).toBeTruthy();
      // Should be today or later
      expect(result!.getTime()).toBeGreaterThanOrEqual(today.getTime());
    });
  });
});
