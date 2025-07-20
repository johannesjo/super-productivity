import { getWorklogStr } from '../../../util/get-work-log-str';

describe('WorklogExportComponent timezone test', () => {
  describe('fileName generation', () => {
    it('should handle date range correctly across timezones', () => {
      // This test demonstrates the usage in worklog-export.component.ts line 146:
      // this.fileName = 'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';

      // Test case: Export range for a specific week
      const rangeStart = new Date('2025-01-13T08:00:00Z'); // Monday 8 AM UTC
      const rangeEnd = new Date('2025-01-17T20:00:00Z'); // Friday 8 PM UTC

      const fileName =
        'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';

      console.log('WorklogExport fileName test:', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        fileName: fileName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // The filename should use local dates
      // In LA (UTC-8): Jan 13 midnight -> Jan 17 noon
      // In Berlin (UTC+1): Jan 13 9 AM -> Jan 17 9 PM
      const tzOffset = new Date().getTimezoneOffset();
      if (tzOffset > 0) {
        // LA
        expect(fileName).toBe('tasks2025-01-13-2025-01-17.csv');
      } else {
        // Berlin
        expect(fileName).toBe('tasks2025-01-13-2025-01-17.csv');
      }
    });

    it('should handle cross-timezone date boundaries', () => {
      // Test case: Range that crosses date boundaries in different timezones
      const rangeStart = new Date('2025-01-16T23:00:00Z'); // 11 PM UTC on Jan 16
      const rangeEnd = new Date('2025-01-17T01:00:00Z'); // 1 AM UTC on Jan 17

      const fileName =
        'tasks' + getWorklogStr(rangeStart) + '-' + getWorklogStr(rangeEnd) + '.csv';

      console.log('WorklogExport cross-timezone test:', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        fileName: fileName,
        expectedInLA: 'tasks2025-01-16-2025-01-16.csv', // Same day in LA
        expectedInBerlin: 'tasks2025-01-17-2025-01-17.csv', // Same day in Berlin
      });

      // In LA (UTC-8): Both times are on Jan 16 (3 PM to 5 PM)
      // In Berlin (UTC+1): Both times are on Jan 17 (midnight to 2 AM)
      const tzOffset = new Date().getTimezoneOffset();
      if (tzOffset > 0) {
        // LA
        expect(fileName).toBe('tasks2025-01-16-2025-01-16.csv');
      } else {
        // Berlin
        expect(fileName).toBe('tasks2025-01-17-2025-01-17.csv');
      }
    });

    it('should create meaningful filenames for typical export scenarios', () => {
      // Test case: Export for a full month
      const monthStart = new Date('2025-01-01T00:00:00Z');
      const monthEnd = new Date('2025-01-31T23:59:59Z');

      const fileName =
        'tasks' + getWorklogStr(monthStart) + '-' + getWorklogStr(monthEnd) + '.csv';

      console.log('WorklogExport month export test:', {
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        fileName: fileName,
        purpose: 'Filename should reflect local dates for the export range',
      });

      // The exact dates depend on timezone but the format should be consistent
      expect(fileName).toMatch(/^tasks\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/);

      // Verify the file extension
      expect(fileName.endsWith('.csv')).toBe(true);
    });
  });
});
