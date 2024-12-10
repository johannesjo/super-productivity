// describe('StringToMsPipe', () => {
//   it('create an instance', () => {
//     const pipe = new StringToMsPipe();
//     expect(pipe).toBeTruthy();
//   });
// });

import { stringToMs } from './string-to-ms.pipe';

describe('stringToMs', () => {
  it('should work', () => {
    expect(stringToMs('1h 10m')).toBe(4200000);
  });

  // @covers #463
  it('should not return NaN for just h', () => {
    expect(stringToMs('h')).toBe(0);
  });

  // @covers #3737
  it('should work improved', () => {
    // Case: no spaces.
    expect(stringToMs('1h10m')).toBe(4200000);

    // Case: missing last unit.
    expect(stringToMs('1h 10')).toBe(4200000);
    expect(stringToMs('1h10')).toBe(4200000);

    // Case: missing all units.
    expect(stringToMs('10')).toBe(0);

    // Case: using floats (with dot or comma separator).
    expect(stringToMs('1.5h')).toBe(5400000);
    expect(stringToMs('1,5h')).toBe(5400000);

    // Case: combining floats with subunits (opinionated choice: adds up).
    expect(stringToMs('1,5h 10m')).toBe(6000000);
  });
});
