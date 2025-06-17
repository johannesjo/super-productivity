import moment from 'moment';
import { JIRA_DATETIME_FORMAT } from './jira.const';

describe('JiraApiService', () => {
  describe('addWorklog$ date formatting', () => {
    it('should format date correctly using moment', () => {
      const testDate = '2024-01-15T10:30:00.000Z';
      const result = moment(testDate).locale('en').format(JIRA_DATETIME_FORMAT);

      // Moment format: YYYY-MM-DDTHH:mm:ss.SSZZ produces timezone without colon
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{2}[+-]\d{4}$/);
    });

    it('should understand the moment format ZZ vs Z', () => {
      const testDate = '2024-01-15T10:30:00.000Z';
      // JIRA_DATETIME_FORMAT uses 'ZZ' which outputs +0100 (without colon)
      const zzFormat = moment(testDate).locale('en').format('YYYY-MM-DDTHH:mm:ss.SSZZ');
      // Using 'Z' outputs +01:00 (with colon)
      const zFormat = moment(testDate).locale('en').format('YYYY-MM-DDTHH:mm:ss.SSZ');

      expect(zzFormat).toMatch(/[+-]\d{4}$/); // Ends with +0100 format
      expect(zFormat).toMatch(/[+-]\d{2}:\d{2}$/); // Ends with +01:00 format
    });

    it('should format date for Jira worklog', () => {
      const testDate = '2024-01-15T10:30:00.000Z';
      const momentResult = moment(testDate).locale('en').format(JIRA_DATETIME_FORMAT);
      const date = new Date(testDate);

      // Build the format that matches moment's output with ZZ (no colon in timezone)
      const pad = (num: number, length = 2): string => String(num).padStart(length, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      const seconds = pad(date.getSeconds());
      const milliseconds = String(date.getMilliseconds())
        .padStart(3, '0')
        .substring(0, 2); // moment uses 2 digits

      // Timezone offset without colon (to match ZZ format)
      const offsetMinutes = date.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
      const offsetMinPart = Math.abs(offsetMinutes % 60);
      const offsetSign = offsetMinutes <= 0 ? '+' : '-';
      const offsetFormatted = `${offsetSign}${pad(offsetHours)}${pad(offsetMinPart)}`;

      const nativeResult = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetFormatted}`;

      expect(momentResult).toBe(nativeResult);
    });
  });
});
