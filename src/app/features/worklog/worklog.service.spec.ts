describe('WorklogService moment replacement', () => {
  describe('date string parsing', () => {
    it('should parse date strings to Date objects', () => {
      const testCases = [
        { dateStr: '2023-10-15', expected: new Date('2023-10-15') },
        { dateStr: '2024-01-01', expected: new Date('2024-01-01') },
        { dateStr: '2024-12-31', expected: new Date('2024-12-31') },
      ];

      testCases.forEach(({ dateStr, expected }) => {
        const result = new Date(dateStr);
        expect(result.getTime()).toBe(expected.getTime());
      });
    });
  });
});
