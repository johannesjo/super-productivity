import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lazySetInterval } from './lazy-set-interval';

describe('lazySetInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute callback periodically', () => {
    const callback = vi.fn();
    lazySetInterval(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should clear interval when returned function is called', () => {
    const callback = vi.fn();
    const clear = lazySetInterval(callback, 1000);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    clear();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1); // Should not increase
  });
});
