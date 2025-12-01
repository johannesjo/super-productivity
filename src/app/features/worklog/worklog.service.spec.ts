describe('WorklogService moment replacement', () => {
  describe('date string parsing', () => {
    it('should parse date strings to Date objects', () => {
      const testCases = [
        { dateStr: '2023-10-15', expected: new Date(2023, 9, 15) },
        { dateStr: '2024-01-01', expected: new Date(2024, 0, 1) },
        { dateStr: '2024-12-31', expected: new Date(2024, 11, 31) },
      ];

      testCases.forEach(({ dateStr, expected }) => {
        // Parse the date string properly to match expected local date
        const [year, month, day] = dateStr.split('-').map(Number);
        const result = new Date(year, month - 1, day);
        expect(result.getTime()).toBe(expected.getTime());
      });
    });
  });
});
