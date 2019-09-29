import {sortStringDates} from './sortStringDates';

describe('sortStringDates', () => {
  it('should sort a list of unsorted dates', () => {
    const dates = [
      '12-02-2015',
      '09-03-2015',
      '12-02-2017',
      '11-02-2015',
      '13-02-2015',
      '15-01-2015',
    ];
    const result = sortStringDates(dates);

    expect(result.length).toBe(dates.length);
    expect(result).toEqual([
      '15-01-2015',
      '11-02-2015',
      '12-02-2015',
      '13-02-2015',
      '09-03-2015',
      '12-02-2017',
    ]);
  });

});
