export const promiseTimeout = (ms: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, ms));
