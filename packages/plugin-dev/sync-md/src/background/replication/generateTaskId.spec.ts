import { generateTaskId } from './generateTaskId';

describe('generateTaskId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateTaskId();
    const id2 = generateTaskId();

    expect(id1).not.toBe(id2);
  });

  it('should follow the expected format', () => {
    const id = generateTaskId();
    const pattern = /^task-\d{13}-[a-z0-9]{9}$/;

    expect(id).toMatch(pattern);
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const id = generateTaskId();
    const after = Date.now();

    const timestamp = parseInt(id.split('-')[1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should generate 100 unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTaskId());
    }

    expect(ids.size).toBe(100);
  });
});
