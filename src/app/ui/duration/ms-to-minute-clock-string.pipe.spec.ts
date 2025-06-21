import {
  MsToMinuteClockStringPipe,
  msToMinuteClockString,
} from './ms-to-minute-clock-string.pipe';

describe('MsToMinuteClockStringPipe', () => {
  it('create an instance', () => {
    const pipe = new MsToMinuteClockStringPipe();
    expect(pipe).toBeTruthy();
  });

  describe('msToMinuteClockString', () => {
    it('should convert milliseconds to minute:second format', () => {
      expect(msToMinuteClockString(0)).toBe('0:00');
      expect(msToMinuteClockString(1000)).toBe('0:01');
      expect(msToMinuteClockString(60000)).toBe('1:00');
      expect(msToMinuteClockString(61000)).toBe('1:01');
      expect(msToMinuteClockString(120000)).toBe('2:00');
    });

    it('should handle hours as 60-minute blocks', () => {
      expect(msToMinuteClockString(3600000)).toBe('60:00'); // 1 hour = 60 minutes
      expect(msToMinuteClockString(7200000)).toBe('120:00'); // 2 hours = 120 minutes
      expect(msToMinuteClockString(3660000)).toBe('61:00'); // 1 hour 1 minute
    });

    it('should handle days as 1440-minute blocks', () => {
      expect(msToMinuteClockString(86400000)).toBe('1440:00'); // 1 day = 24 hours = 1440 minutes
      expect(msToMinuteClockString(90000000)).toBe('1500:00'); // 1 day + 1 hour = 1500 minutes
    });

    it('should pad seconds with leading zeros', () => {
      expect(msToMinuteClockString(5000)).toBe('0:05');
      expect(msToMinuteClockString(59000)).toBe('0:59');
    });
  });
});
