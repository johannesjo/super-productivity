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
});
