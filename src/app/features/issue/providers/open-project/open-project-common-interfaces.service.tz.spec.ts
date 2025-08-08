import { getDbDateStr } from '../../../../util/get-db-date-str';

describe('OpenProjectCommonInterfacesService timezone test', () => {
  describe('getAddTaskData startDate handling', () => {
    it('should handle OpenProject startDate strings correctly across timezones', () => {
      // Test various formats that OpenProject might return for startDate

      // Test 1: ISO date string (most common from OpenProject API)
      // This represents 2025-01-17 in the API response
      const openProjectStartDate1 = '2025-01-17';
      const result1 = getDbDateStr(openProjectStartDate1);

      console.log('Test 1 - OpenProject date string:', {
        input: openProjectStartDate1,
        output: result1,
        expected: '2025-01-17',
      });

      // When OpenProject returns a date string like '2025-01-17',
      // JavaScript's Date constructor interprets it as midnight UTC
      // In timezones with negative offset (like LA), this becomes the previous day
      const date1 = new Date(openProjectStartDate1);
      const tzOffset = date1.getTimezoneOffset();

      if (tzOffset > 0) {
        // Negative UTC offset (e.g., LA)
        // The date will be interpreted as the previous day
        expect(result1).toBe('2025-01-16');
      } else {
        // Positive or zero UTC offset (e.g., Berlin)
        expect(result1).toBe('2025-01-17');
      }
    });

    it('should demonstrate the issue with OpenProject start dates', () => {
      // Simulate what happens in open-project-common-interfaces.service.ts line 160
      const mockOpenProjectIssue = {
        startDate: '2025-01-17', // OpenProject typically returns dates in this format
      };

      // This is what the service does:
      const dueDay = mockOpenProjectIssue.startDate
        ? getDbDateStr(mockOpenProjectIssue.startDate)
        : undefined;

      console.log('OpenProject issue startDate processing:', {
        openProjectStartDate: mockOpenProjectIssue.startDate,
        resultDueDay: dueDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // The issue: A task starting on Jan 17 according to OpenProject
      // will show as due on Jan 16 in LA timezone
      const tzOffset = new Date().getTimezoneOffset();
      if (tzOffset > 0) {
        // LA
        expect(dueDay).toBe('2025-01-16'); // Wrong!
      } else {
        // Berlin
        expect(dueDay).toBe('2025-01-17'); // Correct
      }
    });
  });
});
