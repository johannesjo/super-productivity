import { parseIsoDuration } from './parse-iso-duration';

describe('parseIsoDuration', () => {
  it('should parse PT1H30M', () => {
    expect(parseIsoDuration('PT1H30M')).toBe(5400000); // 1.5 hours
  });

  it('should parse PT2H', () => {
    expect(parseIsoDuration('PT2H')).toBe(7200000); // 2 hours
  });

  it('should parse PT30M', () => {
    expect(parseIsoDuration('PT30M')).toBe(1800000); // 30 minutes
  });

  it('should parse PT1H30M45S', () => {
    expect(parseIsoDuration('PT1H30M45S')).toBe(5445000); // 1h 30m 45s
  });

  it('should parse P1D', () => {
    expect(parseIsoDuration('P1D')).toBe(86400000); // 1 day
  });

  it('should parse P1DT12H', () => {
    expect(parseIsoDuration('P1DT12H')).toBe(129600000); // 1.5 days
  });

  it('should parse PT0S', () => {
    expect(parseIsoDuration('PT0S')).toBe(0);
  });

  it('should parse PT1.5S', () => {
    expect(parseIsoDuration('PT1.5S')).toBe(1500); // 1.5 seconds
  });

  it('should return 0 for invalid input', () => {
    expect(parseIsoDuration('invalid')).toBe(0);
    expect(parseIsoDuration('')).toBe(0);
    expect(parseIsoDuration(null as any)).toBe(0);
    expect(parseIsoDuration(undefined as any)).toBe(0);
  });

  it('should parse complex durations', () => {
    expect(parseIsoDuration('P1Y2M3DT4H5M6S')).toBe(
      /* eslint-disable no-mixed-operators */
      365 * 24 * 60 * 60 * 1000 + // 1 year
        2 * 30 * 24 * 60 * 60 * 1000 + // 2 months
        3 * 24 * 60 * 60 * 1000 + // 3 days
        4 * 60 * 60 * 1000 + // 4 hours
        5 * 60 * 1000 + // 5 minutes
        6 * 1000, // 6 seconds
      /* eslint-enable no-mixed-operators */
    );
  });
});
