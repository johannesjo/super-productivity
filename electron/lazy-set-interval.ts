export const lazySetInterval = (func: () => void, intervalDuration: number): () => void => {
  let lastTimeoutId: any;

  const interval = () => {
    lastTimeoutId = setTimeout(interval, intervalDuration);
    func.call(null);
  };

  lastTimeoutId = setTimeout(interval, intervalDuration);

  return () => {
    clearTimeout(lastTimeoutId);
  };
};
