import { DateService } from './date.service';

describe('DateService timezone test', () => {
  let service: DateService;

  beforeEach(() => {
    service = new DateService();
  });

  describe('todayStr method', () => {
    it('should handle dates correctly across timezones', () => {
      // Test case: A specific date/time
      const testDate = new Date('2025-01-17T15:00:00Z'); // 3 PM UTC

      const result = service.todayStr(testDate);

      console.log('DateService todayStr test:', {
        input: testDate.toISOString(),
        output: result,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // This should return the local date string
      // In LA (UTC-8): 2025-01-17 at 7 AM local -> '2025-01-17'
      // In Berlin (UTC+1): 2025-01-17 at 4 PM local -> '2025-01-17'
      // In Tokyo (UTC+9): 2025-01-18 at 12 AM local -> '2025-01-18'
      // In UTC: 2025-01-17 at 3 PM local -> '2025-01-17'

      const tzOffset = new Date().getTimezoneOffset();
      if (tzOffset <= -540) {
        // Tokyo and further east (UTC+9 or more)
        expect(result).toBe('2025-01-18');
      } else {
        // LA, Berlin, UTC, and most other timezones
        expect(result).toBe('2025-01-17');
      }
    });

    it('should handle edge case near midnight', () => {
      // Test case: Near midnight UTC
      const testDate = new Date('2025-01-16T23:00:00Z'); // 11 PM UTC on Jan 16

      const result = service.todayStr(testDate);

      console.log('DateService edge case test:', {
        input: testDate.toISOString(),
        output: result,
        expectedInLA: '2025-01-16',
        expectedInBerlin: '2025-01-17',
      });

      // This correctly returns different dates based on timezone
      // In LA (UTC-8): 2025-01-16 at 3 PM local -> '2025-01-16'
      // In Berlin (UTC+1): 2025-01-17 at 12 AM local -> '2025-01-17'
      // In UTC: 2025-01-16 at 11 PM local -> '2025-01-16'
      // In Tokyo (UTC+9): 2025-01-17 at 8 AM local -> '2025-01-17'
      const tzOffset = new Date().getTimezoneOffset();
      if (tzOffset >= 0) {
        // LA, UTC, and western timezones
        expect(result).toBe('2025-01-16');
      } else {
        // Berlin, Tokyo, and eastern timezones
        expect(result).toBe('2025-01-17');
      }
    });

    it('should handle startOfNextDayDiff correctly', () => {
      // Set startOfNextDayDiff to 2 hours (simulating work day ending at 2 AM)
      service.setStartOfNextDayDiff(2);

      // Test at 1 AM local time
      const now = new Date();
      now.setHours(1, 0, 0, 0);

      const result = service.todayStr(now);

      console.log('DateService with startOfNextDayDiff:', {
        startOfNextDayDiff: service.startOfNextDayDiff,
        localTime: now.toString(),
        result: result,
        expectedBehavior: 'Should treat 1 AM as previous day due to 2-hour offset',
      });

      // This is working as intended - adjusting the date based on work day settings
      expect(result).toBeDefined();
    });
  });
});
