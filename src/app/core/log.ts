import { environment } from '../../environments/environment';

export enum LogLevel {
  CRITICAL = 0,
  ERROR = 1,
  NORMAL = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

// Map old numeric levels to new enum for backwards compatibility
const LOG_LEVEL = environment.production ? LogLevel.DEBUG : LogLevel.NORMAL;

/**
 * Modern logging class that preserves line numbers using pre-bound console methods
 */
export class Log {
  /** Current log level threshold */
  private static level: LogLevel = LOG_LEVEL;

  /** Current context string */
  private static context: string = '';

  /** Pre-bound console functions that preserve line numbers */
  private static readonly c = console.log.bind(console); // critical
  private static readonly e = (console.error || console.log).bind(console);
  private static readonly n = console.log.bind(console); // normal
  private static readonly v = console.log.bind(console); // verbose
  private static readonly d = (console.debug || console.log).bind(console);

  /** Set the logging level dynamically */
  static setLevel(lvl: LogLevel): void {
    this.level = lvl;
  }

  /** Set the context for subsequent log messages */
  static setContext(ctx: string): void {
    this.context = ctx;
  }

  /** Get formatted prefix with context */
  private static getPrefix(): string {
    return this.context.length ? `[${this.context}]` : '';
  }

  static critical(...args: unknown[]): void {
    // Critical always logs (level 0)
    this.c(this.getPrefix(), ...args);
  }

  static error(...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      this.e(this.getPrefix(), ...args);
    }
  }

  static normal(...args: unknown[]): void {
    if (this.level >= LogLevel.NORMAL) {
      this.n(this.getPrefix(), ...args);
    }
  }

  static verbose(...args: unknown[]): void {
    if (this.level >= LogLevel.VERBOSE) {
      this.v(this.getPrefix(), ...args);
    }
  }

  static debug(...args: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      this.d(this.getPrefix(), ...args);
    }
  }

  // Backwards compatibility aliases
  static log = Log.normal;
  static info = Log.normal;
  static warn = Log.error;

  /**
   * Create a new logger instance with a specific context that preserves line numbers
   * This returns direct bound console functions with context prefix
   */
  static withContext(context: string): {
    critical: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    normal: (...args: unknown[]) => void;
    verbose: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    log: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
  } {
    const contextPrefix = `[${context}]`;

    // Helper function to create conditional loggers that respect log levels
    const createConditionalLogger = (
      requiredLevel: LogLevel,
      consoleFn: typeof console.log,
    ): ((...args: unknown[]) => void) => {
      if (LOG_LEVEL >= requiredLevel) {
        return consoleFn.bind(console, contextPrefix);
      } else {
        return () => {}; // No-op function when logging is disabled
      }
    };

    // Return bound console functions that respect log levels and preserve line numbers
    return {
      critical: createConditionalLogger(LogLevel.CRITICAL, console.log),
      error: createConditionalLogger(LogLevel.ERROR, console.error || console.log),
      normal: createConditionalLogger(LogLevel.NORMAL, console.log),
      verbose: createConditionalLogger(LogLevel.VERBOSE, console.log),
      debug: createConditionalLogger(LogLevel.DEBUG, console.debug || console.log),
      // Aliases
      log: createConditionalLogger(LogLevel.NORMAL, console.log),
      info: createConditionalLogger(LogLevel.NORMAL, console.log),
      warn: createConditionalLogger(LogLevel.ERROR, console.error || console.log),
    };
  }
}

// Pre-configured logger instances for specific contexts
export const SyncLog = Log.withContext('sync');
export const PluginLog = Log.withContext('plugin');

/**
 * Convenience function for normal logging that preserves line numbers
 * Usage: logFn("my normal log message", data)
 * Logs without any context prefix
 */
export const logFn = LOG_LEVEL >= LogLevel.NORMAL ? console.log.bind(console) : () => {};
