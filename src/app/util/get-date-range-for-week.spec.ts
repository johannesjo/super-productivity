import {
  getDateRangeForWeek,
  rangeEndWithTime,
  rangeStartWithTime,
} from './get-date-range-for-week';

describe('sortWorklogDates', () => {
  it('should return a valid range', () => {
    const result = getDateRangeForWeek(2020, 28);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date('2020-07-06')));
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date('2020-07-12')));
  });

  it('should return a valid range for last week of the year', () => {
    const result = getDateRangeForWeek(2020, 53);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date('2020-12-28')));
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date('2021-01-03')));
  });

  it('should return a valid value for first week of the year', () => {
    const result = getDateRangeForWeek(2021, 1);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date('2021-01-04')));
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date('2021-01-10')));
  });
});
