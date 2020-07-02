export function promiseTimeout(ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
