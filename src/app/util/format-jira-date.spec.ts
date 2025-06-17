import { formatJiraDate } from './format-jira-date';
import moment from 'moment';
import { JIRA_DATETIME_FORMAT } from '../features/issue/providers/jira/jira.const';

describe('formatJiraDate', () => {
  it('should format date in Jira format', () => {
    const testDate = '2024-01-15T10:30:00.000Z';
    const result = formatJiraDate(testDate);

    // Should match YYYY-MM-DDTHH:mm:ss.SSZZ format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{2}[+-]\d{4}$/);
  });

  it('should match moment.js output for various dates', () => {
    const testDates = [
      '2024-01-15T10:30:00.000Z',
      '2024-06-01T00:00:00.000Z',
      '2024-12-31T23:59:59.999Z',
      new Date().toISOString(),
    ];

    testDates.forEach((date) => {
      const momentResult = moment(date).locale('en').format(JIRA_DATETIME_FORMAT);
      const nativeResult = formatJiraDate(date);
      expect(nativeResult).toBe(momentResult);
    });
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatJiraDate(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{2}[+-]\d{4}$/);
  });

  it('should handle timestamps', () => {
    const timestamp = new Date('2024-01-15T10:30:00.000Z').getTime();
    const result = formatJiraDate(timestamp);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{2}[+-]\d{4}$/);
  });

  it('should correctly format timezone offset without colon', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatJiraDate(date);

    // Extract timezone part
    const timezonePart = result.substring(result.length - 5);
    expect(timezonePart).toMatch(/^[+-]\d{4}$/); // e.g., +0100 or -0500
  });
});
