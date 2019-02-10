export function promiseTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
