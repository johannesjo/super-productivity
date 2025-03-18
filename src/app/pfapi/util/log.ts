/*
1: critical
2: normal
3: verbose
 */
// const LOG_LEVEL = 2 as const;

// export const pfLog = (logLevel: number, msg: unknown = '', ...args: unknown[]): void => {
//   if (logLevel > LOG_LEVEL) {
//     return;
//   }
//   console.trace.apply(console, ['pf:', msg, ...args]);
// };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createLogger = (prefix: string) => {
  return console.log.bind(console, prefix) as (
    logLevel: number,
    msg: unknown,
    ...args: unknown[]
  ) => void;
};

// Example usage:
export const pfLog = createLogger('pf');
