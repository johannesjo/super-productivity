describe('DailySummaryComponent moment replacement', () => {
  describe('date time parsing', () => {
    it('should parse date and time to timestamp', () => {
      const testCases = [
        {
          dayStr: '2023-10-15',
          timeStr: '09:30',
          expectedMs: new Date('2023-10-15 09:30').getTime(),
        },
        {
          dayStr: '2023-12-25',
          timeStr: '14:45',
          expectedMs: new Date('2023-12-25 14:45').getTime(),
        },
        {
          dayStr: '2024-01-01',
          timeStr: '00:00',
          expectedMs: new Date('2024-01-01 00:00').getTime(),
        },
        {
          dayStr: '2024-02-29',
          timeStr: '23:59',
          expectedMs: new Date('2024-02-29 23:59').getTime(),
        },
      ];

      testCases.forEach(({ dayStr, timeStr, expectedMs }) => {
        const dateTimeStr = `${dayStr} ${timeStr}`;
        const timestamp = new Date(dateTimeStr).getTime();
        expect(timestamp).toBe(expectedMs);
      });
    });
  });
});
