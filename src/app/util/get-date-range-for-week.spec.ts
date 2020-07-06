import { getDateRangeForWeek, rangeEndWithTime, rangeStartWithTime } from './get-date-range-for-week';

describe('sortWorklogDates', () => {
  it('should return a valid range', () => {
    const result = getDateRangeForWeek(2020, 28);

    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date('2020-07-06')));
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date('2020-07-12')));
  });
});
