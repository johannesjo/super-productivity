import { HumanizeTimestampPipe } from './humanize-timestamp.pipe';

describe('HumanizeTimestampPipe', () => {
  it('create an instance', () => {
    const pipe = new HumanizeTimestampPipe();
    expect(pipe).toBeTruthy();
  });
});
