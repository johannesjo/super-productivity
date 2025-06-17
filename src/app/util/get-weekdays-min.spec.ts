import { getWeekdaysMin } from './get-weekdays-min';

describe('getWeekdaysMin', () => {
  it('should return minimal weekday names for en-US locale', () => {
    const weekdays = getWeekdaysMin('en-US');
    expect(weekdays).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  });

  it('should return 7 weekday names', () => {
    const weekdays = getWeekdaysMin('en-US');
    expect(weekdays.length).toBe(7);
  });

  it('should start with Sunday', () => {
    const weekdays = getWeekdaysMin('en-US');
    expect(weekdays[0]).toBe('Su');
    expect(weekdays[6]).toBe('Sa');
  });
});
