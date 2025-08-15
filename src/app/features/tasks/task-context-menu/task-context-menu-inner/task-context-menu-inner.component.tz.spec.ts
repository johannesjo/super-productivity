import { getDbDateStr } from '../../../../util/get-db-date-str';

describe('TaskContextMenuInnerComponent timezone test', () => {
  describe('_schedule method date handling', () => {
    it('should handle scheduled date correctly across timezones', () => {
      // This test demonstrates the usage in task-context-menu-inner.component.ts line 590:
      // const newDay = getWorklogStr(newDayDate);

      // Test case: Scheduling a task for a specific date using local date constructor
      const selectedDate = new Date(2025, 0, 17, 15, 0, 0); // Jan 17, 2025 at 3 PM local time
      const newDayDate = new Date(selectedDate);
      const newDay = getDbDateStr(newDayDate);

      console.log('Task scheduling test:', {
        selectedDate: selectedDate.toISOString(),
        newDay: newDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // When using local date constructor, the date should always be the same regardless of timezone
      expect(newDay).toBe('2025-01-17');
    });

    it('should handle edge case when scheduling near midnight', () => {
      // Test case: Scheduling near midnight using local date constructor
      const selectedDate = new Date(2025, 0, 16, 23, 30, 0); // Jan 16, 2025 at 11:30 PM local time
      const newDayDate = new Date(selectedDate);
      const newDay = getDbDateStr(newDayDate);

      console.log('Midnight edge case test:', {
        selectedDate: selectedDate.toISOString(),
        newDay: newDay,
      });

      // When using local date constructor, the date should always be Jan 16 regardless of timezone
      expect(newDay).toBe('2025-01-16');
    });
  });

  describe('moveToBacklog today check', () => {
    it('should correctly check if task is due today', () => {
      // This test demonstrates the usage in line 523:
      // if (this.task.dueDay === getWorklogStr() || ...)

      const todayStr = getDbDateStr();

      // Test various task due days
      const taskDueToday = { dueDay: todayStr };
      const taskDueTomorrow = { dueDay: '2025-01-18' };
      const taskDueYesterday = { dueDay: '2025-01-16' };

      console.log('Today check test:', {
        todayStr: todayStr,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // Check if task is due today
      expect(taskDueToday.dueDay === getDbDateStr()).toBe(true);
      expect(taskDueTomorrow.dueDay === getDbDateStr()).toBe(false);
      expect(taskDueYesterday.dueDay === getDbDateStr()).toBe(false);
    });

    it('should handle getWorklogStr() without parameters correctly', () => {
      // When called without parameters, getWorklogStr() returns today's date
      const now = Date.now();
      const todayStr = getDbDateStr();
      const expectedDate = new Date(now);

      const year = expectedDate.getFullYear();
      const month = String(expectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(expectedDate.getDate()).padStart(2, '0');
      const expected = `${year}-${month}-${day}`;

      expect(todayStr).toBe(expected);

      console.log('getWorklogStr() without params:', {
        todayStr: todayStr,
        expected: expected,
        purpose: "Returns today's date in local timezone",
      });
    });
  });
});
