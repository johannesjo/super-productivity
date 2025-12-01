import { Debouncer } from '../debouncer';

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('Debouncer', () => {
  let debouncer: Debouncer;
  let mockFn: jest.Mock;

  beforeEach(() => {
    debouncer = new Debouncer();
    mockFn = jest.fn();
    jest.clearAllTimers();
  });

  afterEach(() => {
    debouncer.cancelAll();
  });

  it('should debounce function calls', () => {
    debouncer.debounce('test', mockFn, 1000, 'arg1', 'arg2');

    // Function should not be called immediately
    expect(mockFn).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Function should be called after delay
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should reset timer when called multiple times', () => {
    debouncer.debounce('test', mockFn, 1000);
    jest.advanceTimersByTime(500);

    // Call again - should reset timer
    debouncer.debounce('test', mockFn, 1000);
    jest.advanceTimersByTime(500);

    // Function should not be called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Advance another 500ms to complete the 1000ms
    jest.advanceTimersByTime(500);

    // Now function should be called
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple debounced keys independently', () => {
    const mockFn2 = jest.fn();

    debouncer.debounce('key1', mockFn, 1000);
    debouncer.debounce('key2', mockFn2, 500);

    // Advance 500ms - only key2 should fire
    jest.advanceTimersByTime(500);
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockFn2).toHaveBeenCalledTimes(1);

    // Advance another 500ms - key1 should fire
    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel specific debounced calls', () => {
    debouncer.debounce('test', mockFn, 1000);
    expect(debouncer.isPending('test')).toBe(true);

    debouncer.cancel('test');
    expect(debouncer.isPending('test')).toBe(false);

    jest.advanceTimersByTime(1000);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should cancel all debounced calls', () => {
    const mockFn2 = jest.fn();

    debouncer.debounce('key1', mockFn, 1000);
    debouncer.debounce('key2', mockFn2, 1000);

    expect(debouncer.getPendingCount()).toBe(2);

    debouncer.cancelAll();

    expect(debouncer.getPendingCount()).toBe(0);
    expect(debouncer.isPending('key1')).toBe(false);
    expect(debouncer.isPending('key2')).toBe(false);

    jest.advanceTimersByTime(1000);
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockFn2).not.toHaveBeenCalled();
  });

  it('should track pending calls correctly', () => {
    expect(debouncer.isPending('test')).toBe(false);
    expect(debouncer.getPendingCount()).toBe(0);

    debouncer.debounce('test', mockFn, 1000);

    expect(debouncer.isPending('test')).toBe(true);
    expect(debouncer.getPendingCount()).toBe(1);

    jest.advanceTimersByTime(1000);

    expect(debouncer.isPending('test')).toBe(false);
    expect(debouncer.getPendingCount()).toBe(0);
  });

  it('should handle function that throws errors', () => {
    const errorFn = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });

    // Mock console.error to avoid test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    debouncer.debounce('test', errorFn, 1000);

    // Should not throw when timer fires
    expect(() => {
      jest.advanceTimersByTime(1000);
    }).not.toThrow();

    expect(errorFn).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in debounced function test:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
