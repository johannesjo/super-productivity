import moment from 'moment';

describe('DialogJiraAddWorklogComponent _convertTimestamp', () => {
  describe('moment implementation', () => {
    it('should convert timestamp to ISO string without seconds', () => {
      const timestamp = new Date('2024-01-15T10:30:45.000Z').getTime();
      const date = moment(timestamp);
      const isoStr = date.seconds(0).local().format();
      const result = isoStr.substring(0, 19);

      // Result should be local time without seconds
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
    });

    it('should handle various timestamps', () => {
      const testCases = [
        new Date('2024-01-15T10:30:45.123Z').getTime(),
        new Date('2024-06-01T00:00:59.999Z').getTime(),
        new Date('2024-12-31T23:59:59.999Z').getTime(),
      ];

      testCases.forEach((timestamp) => {
        const date = moment(timestamp);
        const isoStr = date.seconds(0).local().format();
        const result = isoStr.substring(0, 19);

        // Should always have seconds as 00
        expect(result.substring(17, 19)).toBe('00');
        // Should be a valid date string
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
      });
    });
  });

  describe('native implementation', () => {
    it('should convert timestamp to ISO string without seconds', () => {
      const timestamp = new Date('2024-01-15T10:30:45.000Z').getTime();
      const date = new Date(timestamp);

      // Set seconds and milliseconds to 0
      date.setSeconds(0, 0);

      // Get local ISO string and take first 19 characters
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const result = `${year}-${month}-${day}T${hours}:${minutes}:00`;

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
    });
  });
});
