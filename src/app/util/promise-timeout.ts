export const promiseTimeout = (ms: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves to `onTimeout` if `promise` has not settled within `ms`. The timer is
 * cleared as soon as the promise settles, so the fast path leaves nothing
 * pending. Rejections are deliberately NOT swallowed — a caller that wants them
 * absorbed must handle that itself.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  onTimeout: T,
  ms: number,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(onTimeout), ms);
    }),
  ]);
};
