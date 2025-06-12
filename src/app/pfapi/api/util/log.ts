import { environment } from '../../../../environments/environment';
/*
0: critical
2: normal
3: verbose
 */
const LOG_LEVEL = environment.production ? 2 : 0;

/**
 * Safe logging function that prevents crashes during console access
 * Handles cases where console is undefined or window access fails during app shutdown/idle
 */
export const pfLog = (logLevel: number, msg: unknown = '', ...args: unknown[]): void => {
  if (logLevel > LOG_LEVEL) {
    return;
  }

  try {
    // Safe console access check
    if (typeof console === 'undefined' || typeof console.log !== 'function') {
      return;
    }

    // Safe prefix access
    const prefix = getLogPrefix();

    // Safe argument processing
    const safeArgs = processSafeArgs(args);

    if (typeof msg === 'string') {
      if (msg[0] === '_') {
        msg = msg.slice(1);
      }
      console.log.apply(console, [prefix + ' ' + msg, ...safeArgs]);
    } else {
      const safeMsg = processSafeArg(msg);
      console.log.apply(console, [prefix, safeMsg, ...safeArgs]);
    }
  } catch (error) {
    // Fail silently to prevent secondary crashes during error handling
    // Only attempt fallback logging if we can safely access console
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('pfLog failed:', error);
      }
    } catch {
      // Ultimate fallback - do nothing to prevent crash loops
    }
  }
};

/**
 * Safely gets log prefix, handles window access failures
 */
const getLogPrefix = (): string => {
  try {
    return (typeof window !== 'undefined' && (window as any).PF_LOG_PREFIX) || '_';
  } catch {
    return '_';
  }
};

/**
 * Process arguments safely to prevent circular reference crashes
 */
const processSafeArgs = (args: unknown[]): unknown[] => {
  return args.map((arg) => processSafeArg(arg));
};

/**
 * Process single argument safely to prevent serialization crashes
 */
const processSafeArg = (arg: unknown): unknown => {
  if (arg === null || arg === undefined) {
    return arg;
  }

  // Handle primitive types safely
  if (typeof arg !== 'object') {
    return arg;
  }

  try {
    // Test if object can be safely serialized (detects circular references)
    JSON.stringify(arg);
    return arg;
  } catch {
    // Handle objects that can't be serialized
    try {
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: arg.stack?.substring(0, 500), // Limit stack trace length
        };
      }

      if (Array.isArray(arg)) {
        return '[Array with circular references or non-serializable content]';
      }

      return '[Object with circular references or non-serializable content]';
    } catch {
      return '[Non-serializable object]';
    }
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// const createLogger = (prefix: string) => {
//   return console.log.bind(console, prefix) as (
//     logLevel: number,
//     msg: unknown,
//     ...args: unknown[]
//   ) => void;
// };
//
// // Example usage:
// export const pfLog = createLogger(LOG_PREFIX);
