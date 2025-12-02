import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow execution within limit', () => {
    limiter = new RateLimiter(2, 1000);
    expect(limiter.check('rule1')).toBe(true);
    expect(limiter.check('rule1')).toBe(true);
  });

  it('should block execution exceeding limit', () => {
    limiter = new RateLimiter(2, 1000);
    limiter.check('rule1');
    limiter.check('rule1');
    expect(limiter.check('rule1')).toBe(false);
  });

  it('should reset count after window passes', () => {
    limiter = new RateLimiter(1, 1000);
    expect(limiter.check('rule1')).toBe(true);
    expect(limiter.check('rule1')).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(limiter.check('rule1')).toBe(true);
  });

  it('should track rules independently', () => {
    limiter = new RateLimiter(1, 1000);
    expect(limiter.check('rule1')).toBe(true);
    expect(limiter.check('rule2')).toBe(true);
  });

  it('should manually reset', () => {
    limiter = new RateLimiter(1, 1000);
    limiter.check('rule1');
    expect(limiter.check('rule1')).toBe(false);

    limiter.reset('rule1');
    expect(limiter.check('rule1')).toBe(true);
  });
});
