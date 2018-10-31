import { NumberToMonthPipe } from './number-to-month.pipe';

describe('NumberToMonthPipe', () => {
  it('create an instance', () => {
    const pipe = new NumberToMonthPipe();
    expect(pipe).toBeTruthy();
  });
});
