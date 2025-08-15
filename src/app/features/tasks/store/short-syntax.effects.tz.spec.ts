import { getDbDateStr } from '../../../util/get-db-date-str';

describe('ShortSyntaxEffects timezone test', () => {
  describe('plannedDayInIsoFormat calculation', () => {
    it('should use local date when converting timestamp to date string', () => {
      // This test demonstrates the issue with line 151 in short-syntax.effects.ts:
      // const plannedDayInIsoFormat = getWorklogStr(plannedDay);
      // where plannedDay = new Date(dueWithTime)

      // Test case 1: Midnight LA time on 2025-01-17
      const dueWithTime1 = new Date('2025-01-17T00:00:00-08:00').getTime();
      const plannedDay1 = new Date(dueWithTime1);
      const plannedDayInIsoFormat1 = getDbDateStr(plannedDay1);

      // In LA timezone, this should be 2025-01-17
      // In Berlin timezone, this might also be 2025-01-17 because getWorklogStr uses local date
      console.log('Test 1 - Midnight LA:', {
        dueWithTime: dueWithTime1,
        plannedDay: plannedDay1.toString(),
        isoFormat: plannedDayInIsoFormat1,
        expectedInLA: '2025-01-17',
        expectedInBerlin: '2025-01-17',
      });

      // Test case 2: 11 PM LA time on 2025-01-16 (which is 7 AM UTC on 2025-01-17)
      const dueWithTime2 = new Date('2025-01-16T23:00:00-08:00').getTime();
      const plannedDay2 = new Date(dueWithTime2);
      const plannedDayInIsoFormat2 = getDbDateStr(plannedDay2);

      // In LA timezone, this should be 2025-01-16
      // In Berlin timezone, this would be 2025-01-17
      console.log('Test 2 - Late night LA:', {
        dueWithTime: dueWithTime2,
        plannedDay: plannedDay2.toString(),
        isoFormat: plannedDayInIsoFormat2,
        expectedInLA: '2025-01-16',
        expectedInBerlin: '2025-01-17',
      });

      // Test to see current behavior
      const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Current timezone:', currentTZ);

      if (currentTZ.includes('Los_Angeles')) {
        expect(plannedDayInIsoFormat1).toBe('2025-01-17');
        expect(plannedDayInIsoFormat2).toBe('2025-01-16');
      } else if (currentTZ.includes('Berlin')) {
        expect(plannedDayInIsoFormat1).toBe('2025-01-17');
        expect(plannedDayInIsoFormat2).toBe('2025-01-17'); // Different from LA!
      }
    });

    it('should demonstrate the timezone issue more clearly', () => {
      // Create a timestamp that represents different days in different timezones
      // 2025-01-16 23:00:00 PST = 2025-01-17 08:00:00 CET
      const timestamp = 1737094800000; // Fixed timestamp

      const date = new Date(timestamp);
      const dayStr = getDbDateStr(date);

      const tzOffset = date.getTimezoneOffset();
      console.log('Timezone offset in minutes:', tzOffset);
      console.log('Date object:', date.toString());
      console.log('Day string:', dayStr);

      // In LA (UTC-8), offset is 480, day should be 2025-01-16
      // In Berlin (UTC+1), offset is -60, day should be 2025-01-17
      if (tzOffset === 480) {
        // LA timezone
        expect(dayStr).toBe('2025-01-16');
      } else if (tzOffset === -60) {
        // Berlin timezone
        expect(dayStr).toBe('2025-01-17');
      }
    });
  });
});
