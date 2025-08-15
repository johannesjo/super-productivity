import { MomentFormatPipe } from './moment-format.pipe';

describe('MomentFormatPipe', () => {
  let pipe: MomentFormatPipe;

  beforeEach(() => {
    pipe = new MomentFormatPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format date with HH:mm format', () => {
    const date = new Date(2024, 0, 15, 14, 30, 0);
    expect(pipe.transform(date, 'HH:mm')).toBe('14:30');
  });

  it('should format date with different formats', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45);
    expect(pipe.transform(date, 'YYYY-MM-DD')).toBe('2024-01-15');
    expect(pipe.transform(date, 'DD/MM/YYYY')).toBe('15/01/2024');
    expect(pipe.transform(date, 'MMM D, YYYY')).toBe('Jan 15, 2024');
  });

  it('should handle timestamps', () => {
    const timestamp = new Date(2024, 0, 15, 14, 30, 0).getTime();
    expect(pipe.transform(timestamp, 'HH:mm')).toBe('14:30');
  });

  it('should return null for invalid input', () => {
    expect(pipe.transform(null, 'HH:mm')).toBeNull();
    expect(pipe.transform(undefined, 'HH:mm')).toBeNull();
    expect(pipe.transform('', 'HH:mm')).toBeNull();
    expect(pipe.transform('invalid', 'HH:mm')).toBeNull();
  });

  it('should return null when format is not provided', () => {
    expect(pipe.transform(new Date(), null)).toBeNull();
    expect(pipe.transform(new Date(), '')).toBeNull();
  });
});
