import { getDbDateStr } from '../../../util/get-db-date-str';

describe('Add Task Bar - Timezone Integration', () => {
  describe('Date String Handling', () => {
    it('should create consistent dates from YYYY-MM-DD strings', () => {
      const dateStr = '2025-01-15';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      // Verify the date is created in local timezone
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January (0-indexed)
      expect(date.getDate()).toBe(15);

      // Verify it round-trips correctly
      const roundTripped = getDbDateStr(date);
      expect(roundTripped).toBe(dateStr);
    });

    it('should handle dates with times correctly', () => {
      const dateStr = '2025-01-15';
      const timeStr = '14:30';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      // Verify the time is set correctly
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);

      // Verify the date is still correct
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should handle midnight correctly', () => {
      const dateStr = '2025-01-15';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      // Verify midnight doesn't shift the date
      expect(date.getDate()).toBe(15);
      expect(getDbDateStr(date)).toBe(dateStr);
    });

    it('should handle end of day correctly', () => {
      const dateStr = '2025-01-15';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(23, 59, 59, 999);

      // Verify end of day doesn't shift to next date
      expect(date.getDate()).toBe(15);
      expect(getDbDateStr(date)).toBe(dateStr);
    });

    it('should handle month boundaries correctly', () => {
      // Test last day of January
      const dateStr = '2025-01-31';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      expect(date.getDate()).toBe(31);
      expect(date.getMonth()).toBe(0);
      expect(getDbDateStr(date)).toBe(dateStr);

      // Adding one day should roll to February
      date.setDate(date.getDate() + 1);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(1);
    });

    it('should handle leap years correctly', () => {
      // 2024 is a leap year
      const leapDateStr = '2024-02-29';
      const [year, month, day] = leapDateStr.split('-').map(Number);
      const leapDate = new Date(year, month - 1, day);

      expect(leapDate.getDate()).toBe(29);
      expect(leapDate.getMonth()).toBe(1); // February
      expect(getDbDateStr(leapDate)).toBe(leapDateStr);

      // 2025 is not a leap year - Feb 29 should roll to March 1
      const nonLeapDate = new Date(2025, 1, 29); // Feb 29, 2025
      expect(nonLeapDate.getMonth()).toBe(2); // March
      expect(nonLeapDate.getDate()).toBe(1);
    });

    it('should handle year boundaries correctly', () => {
      // New Year's Eve
      const nyeStr = '2024-12-31';
      const [year, month, day] = nyeStr.split('-').map(Number);
      const nyeDate = new Date(year, month - 1, day);
      nyeDate.setHours(23, 59, 59);

      expect(nyeDate.getFullYear()).toBe(2024);
      expect(nyeDate.getMonth()).toBe(11); // December
      expect(nyeDate.getDate()).toBe(31);

      // Add one minute to cross into new year
      nyeDate.setMinutes(nyeDate.getMinutes() + 1);
      expect(nyeDate.getFullYear()).toBe(2025);
      expect(nyeDate.getMonth()).toBe(0); // January
      expect(nyeDate.getDate()).toBe(1);
    });
  });

  describe('DST Transition Safety', () => {
    it('should handle spring forward DST transition', () => {
      // In US Eastern time, March 10, 2024 at 2:00 AM -> 3:00 AM
      // 2:30 AM doesn't exist, but JavaScript handles it gracefully
      const dstDateStr = '2024-03-10';
      const [year, month, day] = dstDateStr.split('-').map(Number);
      const dstDate = new Date(year, month - 1, day);
      dstDate.setHours(2, 30, 0, 0);

      // The date should still be March 10
      expect(dstDate.getDate()).toBe(10);
      expect(dstDate.getMonth()).toBe(2); // March
      expect(getDbDateStr(dstDate)).toBe(dstDateStr);
    });

    it('should handle fall back DST transition', () => {
      // In US Eastern time, November 3, 2024 at 2:00 AM -> 1:00 AM
      // 1:30 AM occurs twice
      const dstDateStr = '2024-11-03';
      const [year, month, day] = dstDateStr.split('-').map(Number);
      const dstDate = new Date(year, month - 1, day);
      dstDate.setHours(1, 30, 0, 0);

      // The date should still be November 3
      expect(dstDate.getDate()).toBe(3);
      expect(dstDate.getMonth()).toBe(10); // November
      expect(getDbDateStr(dstDate)).toBe(dstDateStr);
    });
  });

  describe('Timestamp Consistency', () => {
    it('should create consistent timestamps for dates with times', () => {
      const dateStr = '2025-01-15';
      const timeStr = '14:30';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);

      const timestamp = date.getTime();

      // Create a new date from the timestamp
      const recreatedDate = new Date(timestamp);
      expect(recreatedDate.getFullYear()).toBe(2025);
      expect(recreatedDate.getMonth()).toBe(0);
      expect(recreatedDate.getDate()).toBe(15);
      expect(recreatedDate.getHours()).toBe(14);
      expect(recreatedDate.getMinutes()).toBe(30);
    });

    it('should maintain date integrity when storing as timestamp', () => {
      const testCases = [
        { date: '2025-01-01', time: '00:00' }, // New Year midnight
        { date: '2025-06-15', time: '12:00' }, // Mid-year noon
        { date: '2025-12-31', time: '23:59' }, // New Year's Eve
        { date: '2024-02-29', time: '15:30' }, // Leap year date
      ];

      testCases.forEach(({ date: dateStr, time: timeStr }) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const [hours, minutes] = timeStr.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);

        const timestamp = date.getTime();
        const recreated = new Date(timestamp);

        expect(getDbDateStr(recreated)).toBe(dateStr);
        expect(recreated.getHours()).toBe(hours);
        expect(recreated.getMinutes()).toBe(minutes);
      });
    });
  });
});
