import { ToArrayPipe } from './to-array.pipe';

describe('ToArrayPipe', () => {
  it('create an instance', () => {
    const pipe = new ToArrayPipe();
    expect(pipe).toBeTruthy();
  });
});
