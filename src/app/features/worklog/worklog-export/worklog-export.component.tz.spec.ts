import { getDbDateStr } from '../../../util/get-db-date-str';

describe('WorklogExportComponent timezone test', () => {
  describe('fileName generation', () => {
    it('should handle date range correctly across timezones', () => {
      // This test demonstrates the usage in worklog-export.component.ts line 146:
      // this.fileName = 'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';

      // Test case: Export range for a specific week using local date constructors
      const rangeStart = new Date(2025, 0, 13, 8, 0, 0); // Jan 13, 2025 at 8 AM local time
      const rangeEnd = new Date(2025, 0, 17, 20, 0, 0); // Jan 17, 2025 at 8 PM local time

      const fileName =
        'tasks' + getDbDateStr(rangeStart) + '-' + getDbDateStr(rangeEnd) + '.csv';

      console.log('WorklogExport fileName test:', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        fileName: fileName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // When using local date constructor, the dates should always be the same regardless of timezone
      expect(fileName).toBe('tasks2025-01-13-2025-01-17.csv');
    });

    it('should handle cross-timezone date boundaries', () => {
      // Test case: Range that crosses date boundaries using local date constructors
      const rangeStart = new Date(2025, 0, 16, 23, 0, 0); // Jan 16, 2025 at 11 PM local time
      const rangeEnd = new Date(2025, 0, 17, 1, 0, 0); // Jan 17, 2025 at 1 AM local time

      const fileName =
        'tasks' + getDbDateStr(rangeStart) + '-' + getDbDateStr(rangeEnd) + '.csv';

      console.log('WorklogExport cross-timezone test:', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        fileName: fileName,
      });

      // When using local date constructor, the dates are Jan 16 to Jan 17 regardless of timezone
      expect(fileName).toBe('tasks2025-01-16-2025-01-17.csv');
    });

    it('should create meaningful filenames for typical export scenarios', () => {
      // Test case: Export for a full month using local date constructors
      const monthStart = new Date(2025, 0, 1, 0, 0, 0); // Jan 1, 2025 at midnight local time
      const monthEnd = new Date(2025, 0, 31, 23, 59, 59); // Jan 31, 2025 at 11:59:59 PM local time

      const fileName =
        'tasks' + getDbDateStr(monthStart) + '-' + getDbDateStr(monthEnd) + '.csv';

      console.log('WorklogExport month export test:', {
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        fileName: fileName,
        purpose: 'Filename should reflect local dates for the export range',
      });

      // When using local date constructor, the dates should be Jan 1 to Jan 31
      expect(fileName).toBe('tasks2025-01-01-2025-01-31.csv');

      // Verify the file extension
      expect(fileName.endsWith('.csv')).toBe(true);
    });
  });
});
