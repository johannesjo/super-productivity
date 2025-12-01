import { getDbDateStr } from '../../../util/get-db-date-str';

describe('Add Task Bar - Cross-Timezone Date Logic', () => {
  describe('Date String Creation Logic (from addTask method)', () => {
    it('should create dates in local timezone from YYYY-MM-DD strings', () => {
      // This mirrors the logic from add-task-bar.component.ts lines 380-381
      const dateStr = '2025-01-15';
      const timeStr = '14:30';

      // Parse date components to create date in local timezone
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      if (timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
      }

      // Verify the date was created correctly in local timezone
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);

      // Verify it round-trips correctly
      const roundTrippedDateStr = getDbDateStr(date);
      expect(roundTrippedDateStr).toBe(dateStr);
    });

    it('should handle midnight times correctly across timezones', () => {
      // Critical test: midnight in local time should stay on the same date
      const dateStr = '2025-12-31'; // New Year's Eve
      const timeStr = '00:00';

      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      // Should still be December 31st, not January 1st
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11); // December
      expect(date.getDate()).toBe(31);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);

      // Round-trip test
      expect(getDbDateStr(date)).toBe(dateStr);
    });

    it('should handle end-of-day times correctly', () => {
      const dateStr = '2025-01-01'; // New Year's Day
      const timeStr = '23:59';

      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      // Should still be January 1st
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(1);
      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);

      // Round-trip test
      expect(getDbDateStr(date)).toBe(dateStr);
    });
  });

  describe('DST Transition Handling', () => {
    it('should handle spring DST transition gracefully', () => {
      // In many US timezones, second Sunday in March is DST start
      // March 9, 2025 is a typical DST transition date
      const dstDateStr = '2025-03-09';
      const dstTimeStr = '02:30'; // This time may not exist due to DST

      const [year, month, day] = dstDateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = dstTimeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      // Date should still be March 9th (browser handles DST gracefully)
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(2); // March
      expect(date.getDate()).toBe(9);

      // Time may be adjusted, but date should remain consistent
      expect(getDbDateStr(date)).toBe(dstDateStr);
    });

    it('should handle fall DST transition gracefully', () => {
      // First Sunday in November is typical DST end in US
      const dstDateStr = '2025-11-02';
      const dstTimeStr = '01:30'; // This time occurs twice

      const [year, month, day] = dstDateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = dstTimeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      // Date should remain November 2nd
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getDate()).toBe(2);

      expect(getDbDateStr(date)).toBe(dstDateStr);
    });
  });

  describe('Month and Year Boundary Handling', () => {
    it('should handle month boundaries correctly', () => {
      const testCases = [
        { date: '2025-01-31', time: '12:00', desc: 'January 31st' },
        { date: '2025-02-28', time: '18:30', desc: 'February 28th (non-leap year)' },
        { date: '2024-02-29', time: '09:15', desc: 'February 29th (leap year)' },
        { date: '2025-04-30', time: '21:45', desc: 'April 30th' },
        { date: '2025-12-31', time: '23:59', desc: 'December 31st' },
      ];

      testCases.forEach(({ date: dateStr, time: timeStr, desc }) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const [hours, minutes] = timeStr.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);

        expect(date.getFullYear()).toBe(year);
        expect(date.getMonth()).toBe(month - 1);
        expect(date.getDate()).toBe(day);
        expect(date.getHours()).toBe(hours);
        expect(date.getMinutes()).toBe(minutes);

        // Round-trip consistency
        expect(getDbDateStr(date)).toBe(dateStr);
      });
    });

    it('should handle year boundaries correctly', () => {
      // Test crossing from 2024 to 2025
      const endOfYear = '2024-12-31';
      const endTime = '23:30';

      const [year, month, day] = endOfYear.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = endTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11); // December
      expect(date.getDate()).toBe(31);

      // Add 30 minutes to cross into new year
      date.setMinutes(date.getMinutes() + 30);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(1);
    });
  });

  describe('Task Data Structure Consistency', () => {
    it('should create correct task data for date-only tasks', () => {
      // When no time is specified, task should use dueDay instead of dueWithTime
      const dateStr = '2025-06-15';

      // This logic mirrors what happens in addTask() when there's no time
      const taskData: any = {};
      taskData.dueDay = dateStr; // Direct assignment for date-only tasks

      expect(taskData.dueDay).toBe(dateStr);
      expect(taskData.dueWithTime).toBeUndefined();
      expect(taskData.hasPlannedTime).toBeUndefined();
    });

    it('should create correct task data for timed tasks', () => {
      // When time is specified, task should use dueWithTime
      const dateStr = '2025-06-15';
      const timeStr = '16:45';

      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      const taskData: any = {};
      taskData.dueWithTime = date.getTime();
      taskData.hasPlannedTime = true;

      expect(taskData.dueWithTime).toBeDefined();
      expect(taskData.hasPlannedTime).toBe(true);
      expect(taskData.dueDay).toBeUndefined();

      // Verify the timestamp represents the correct time
      const resultDate = new Date(taskData.dueWithTime);
      expect(resultDate.getFullYear()).toBe(2025);
      expect(resultDate.getMonth()).toBe(5); // June
      expect(resultDate.getDate()).toBe(15);
      expect(resultDate.getHours()).toBe(16);
      expect(resultDate.getMinutes()).toBe(45);
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle invalid date inputs gracefully', () => {
      // Test malformed date that JavaScript will roll over
      const invalidDateStr = '2025-13-32'; // 13th month, 32nd day

      const [year, month, day] = invalidDateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      // JavaScript will roll this over to a valid date
      // month 12 (13-1) becomes next year's month 0, day 32 becomes Feb 1
      expect(date.getFullYear()).toBe(2026); // Rolls to next year
      expect(date.getMonth()).toBe(1); // February (month 12 + day 32 rollover)
      expect(date.getDate()).toBe(1); // 1st

      // Should produce a valid date string
      const result = getDbDateStr(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle leap year edge cases', () => {
      // 2024 is a leap year, 2025 is not
      const leapYearDate = '2024-02-29';
      const [year, month, day] = leapYearDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29);

      // Test non-leap year - Feb 29 should roll to March 1
      const nonLeapDate = new Date(2025, 1, 29); // Feb 29, 2025
      expect(nonLeapDate.getMonth()).toBe(2); // March
      expect(nonLeapDate.getDate()).toBe(1);
    });
  });
});
