import { sortWorklogDates } from './sortWorklogDates';

describe('sortWorklogDates', () => {
  it('should sort a list of unsorted dates', () => {
    const dates = [
      '2015-02-12',
      '2015-03-09',
      '2017-02-12',
      '2015-02-11',
      '2015-02-13',
      '2015-01-15',
    ];
    const result = sortWorklogDates(dates);

    expect(result.length).toBe(dates.length);
    expect(result).toEqual([
      '2015-01-15',
      '2015-02-11',
      '2015-02-12',
      '2015-02-13',
      '2015-03-09',
      '2017-02-12',
    ]);
  });

  it('should sort a list of unsorted dates with zeros', () => {
    const dates = ['2019-10-04', '2019-09-29', '2019-10-02', '2019-09-30', '2019-10-01'];
    const result = sortWorklogDates(dates);

    expect(result.length).toBe(dates.length);
    expect(result).toEqual([
      '2019-09-29',
      '2019-09-30',
      '2019-10-01',
      '2019-10-02',
      '2019-10-04',
    ]);
  });
});
