// avoids the performance issues caused by normal set interval, when the user
// is not at the computer for some time
export const lazySetInterval = (
  func: () => void,
  intervalDuration: number,
): (() => void) => {
  let lastTimeoutId: any;

  const interval = (): void => {
    lastTimeoutId = setTimeout(interval, intervalDuration);
    func.call(null);
  };

  lastTimeoutId = setTimeout(interval, intervalDuration);

  return () => {
    clearTimeout(lastTimeoutId);
  };
};
