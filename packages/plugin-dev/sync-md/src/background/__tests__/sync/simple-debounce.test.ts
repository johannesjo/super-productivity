describe('Simple Timer Test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute setTimeout callback', async () => {
    const callback = jest.fn();

    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should execute async setTimeout callback', async () => {
    const asyncCallback = jest.fn().mockResolvedValue('done');
    const wrapper = jest.fn(() => {
      asyncCallback();
    });

    setTimeout(wrapper, 1000);

    expect(wrapper).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    expect(wrapper).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(asyncCallback).toHaveBeenCalledTimes(1);
  });
});
