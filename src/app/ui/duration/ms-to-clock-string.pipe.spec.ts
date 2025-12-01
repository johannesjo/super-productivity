import { MsToClockStringPipe, msToClockString } from './ms-to-clock-string.pipe';

describe('MsToClockStringPipe', () => {
  it('create an instance', () => {
    const pipe = new MsToClockStringPipe();
    expect(pipe).toBeTruthy();
  });

  describe('msToClockString', () => {
    it('should convert milliseconds to clock format', () => {
      expect(msToClockString(0)).toBe('-');
      expect(msToClockString(60000)).toBe('0:01');
      expect(msToClockString(3600000)).toBe('1:00');
      expect(msToClockString(3660000)).toBe('1:01');
      expect(msToClockString(3720000)).toBe('1:02');
    });

    it('should handle multiple hours', () => {
      expect(msToClockString(7200000)).toBe('2:00');
      expect(msToClockString(10800000)).toBe('3:00');
      expect(msToClockString(36000000)).toBe('10:00');
    });

    it('should handle days as 24-hour blocks', () => {
      expect(msToClockString(86400000)).toBe('24:00'); // 1 day
      expect(msToClockString(90000000)).toBe('25:00'); // 1 day + 1 hour
      expect(msToClockString(172800000)).toBe('48:00'); // 2 days
    });

    it('should show seconds when requested', () => {
      expect(msToClockString(3665000, true)).toBe('1:01:05');
      expect(msToClockString(60000, true)).toBe('0:01:00');
      expect(msToClockString(1000, true)).toBe('0:00:01');
    });

    it('should handle isHideEmptyPlaceholder', () => {
      expect(msToClockString(0, false, true)).toBe('0:00');
      expect(msToClockString(0, false, false)).toBe('-');
    });
  });
});
