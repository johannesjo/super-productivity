import { getDbDateStr } from '../../../../util/get-db-date-str';

describe('GitlabCommonInterfacesService timezone test', () => {
  describe('getAddTaskData due_date handling', () => {
    it('should handle GitLab due_date strings correctly across timezones', () => {
      // Test various formats that GitLab might return for due_date

      // Test 1: ISO date string (most common from GitLab API)
      // This represents 2025-01-17 in the API response
      const gitlabDueDate1 = '2025-01-17';
      const result1 = getDbDateStr(gitlabDueDate1);

      console.log('Test 1 - GitLab date string:', {
        input: gitlabDueDate1,
        output: result1,
        expected: '2025-01-17',
      });

      // When GitLab returns a date string like '2025-01-17',
      // JavaScript's Date constructor interprets it as midnight UTC
      // In timezones with negative offset (like LA), this becomes the previous day
      const date1 = new Date(gitlabDueDate1);
      const tzOffset = date1.getTimezoneOffset();

      if (tzOffset > 0) {
        // Negative UTC offset (e.g., LA)
        // The date will be interpreted as the previous day
        expect(result1).toBe('2025-01-16');
      } else {
        // Positive or zero UTC offset (e.g., Berlin)
        expect(result1).toBe('2025-01-17');
      }

      // Test 2: What if GitLab returns ISO 8601 with time?
      const gitlabDueDate2 = '2025-01-17T00:00:00Z';
      const result2 = getDbDateStr(gitlabDueDate2);

      console.log('Test 2 - GitLab ISO 8601:', {
        input: gitlabDueDate2,
        output: result2,
        expectedInLA: '2025-01-16',
        expectedInBerlin: '2025-01-17',
      });

      // This is midnight UTC, which is:
      // - Previous day in LA (UTC-8)
      // - Same day in Berlin (UTC+1)
      if (tzOffset > 0) {
        // LA
        expect(result2).toBe('2025-01-16');
      } else {
        // Berlin
        expect(result2).toBe('2025-01-17');
      }
    });

    it('should demonstrate the issue with GitLab due dates', () => {
      // Simulate what happens in gitlab-common-interfaces.service.ts line 195
      const mockGitlabIssue = {
        due_date: '2025-01-17', // GitLab typically returns dates in this format
      };

      // This is what the service does:
      const dueDay = mockGitlabIssue.due_date
        ? getDbDateStr(mockGitlabIssue.due_date)
        : undefined;

      console.log('GitLab issue due_date processing:', {
        gitlabDueDate: mockGitlabIssue.due_date,
        resultDueDay: dueDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      });

      // The issue: A task due on Jan 17 according to GitLab
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
