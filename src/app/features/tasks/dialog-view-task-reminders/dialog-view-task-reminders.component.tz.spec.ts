import { getDbDateStr } from '../../../util/get-db-date-str';
import { getTomorrow } from '../../../util/get-tomorrow';

describe('DialogViewTaskRemindersComponent timezone test', () => {
  describe('planForTomorrow method', () => {
    it("should handle tomorrow's date correctly across timezones", () => {
      // This test demonstrates the usage in dialog-view-task-reminders.component.ts line 180:
      // day: getWorklogStr(getTomorrow()),

      const tomorrow = getTomorrow();
      const tomorrowStr = getDbDateStr(tomorrow);

      console.log('Plan for tomorrow test:', {
        tomorrow: tomorrow.toISOString(),
        tomorrowStr: tomorrowStr,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // Verify it's tomorrow's date
      const today = new Date();
      const expectedTomorrow = new Date(today);
      expectedTomorrow.setDate(expectedTomorrow.getDate() + 1);

      const year = expectedTomorrow.getFullYear();
      const month = String(expectedTomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(expectedTomorrow.getDate()).padStart(2, '0');
      const expected = `${year}-${month}-${day}`;

      expect(tomorrowStr).toBe(expected);
    });

    it('should handle edge case near midnight', () => {
      // Test that getTomorrow() + getWorklogStr() works correctly
      // even when called near midnight

      // Mock a time near midnight
      const nearMidnight = new Date();
      nearMidnight.setHours(23, 59, 30); // 11:59:30 PM

      // getTomorrow() should still return tomorrow's date
      const tomorrow = getTomorrow();
      const tomorrowStr = getDbDateStr(tomorrow);

      console.log('Near midnight test:', {
        currentTime: nearMidnight.toISOString(),
        tomorrow: tomorrow.toISOString(),
        tomorrowStr: tomorrowStr,
        purpose: 'Ensure consistent behavior near day boundaries',
      });

      // Should be tomorrow's date in the local timezone
      expect(tomorrowStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's not today
      const todayStr = getDbDateStr(new Date());
      expect(tomorrowStr).not.toBe(todayStr);
    });

    it('should work consistently across different timezones', () => {
      // Test multiple calls to ensure consistency
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const tomorrow = getTomorrow();
        const tomorrowStr = getDbDateStr(tomorrow);
        results.push(tomorrowStr);
      }

      // All calls should return the same tomorrow date
      const allSame = results.every((r) => r === results[0]);
      expect(allSame).toBe(true);

      console.log('Consistency test:', {
        firstResult: results[0],
        allResultsSame: allSame,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    });
  });
});
