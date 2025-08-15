import { getTodayStr } from './get-today-str';
import { getDbDateStr } from '../../../util/get-db-date-str';

describe('getTodayStr timezone test', () => {
  it("should return today's date string in local timezone", () => {
    const result = getTodayStr();
    const expected = getDbDateStr(new Date());

    console.log('getTodayStr test:', {
      result: result,
      expected: expected,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
    });

    expect(result).toBe(expected);

    // Verify format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should be consistent with direct getWorklogStr calls', () => {
    // Test multiple calls in quick succession
    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(getTodayStr());
    }

    // All calls should return the same value
    const allSame = results.every((r) => r === results[0]);
    expect(allSame).toBe(true);

    console.log('Consistency test:', {
      firstResult: results[0],
      allResultsSame: allSame,
      purpose: "Utility function should consistently return today's date",
    });
  });
});
