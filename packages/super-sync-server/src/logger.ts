const getTimestamp = (): string => new Date().toISOString();

export const Logger = {
  debug: (message: string, ...args: unknown[]): void => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`${getTimestamp()} [DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]): void => {
    console.log(`${getTimestamp()} [INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`${getTimestamp()} [WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(`${getTimestamp()} [ERROR] ${message}`, ...args);
  },
};
