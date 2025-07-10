import { environment } from '../../environments/environment';

export enum LogLevel {
  CRITICAL = 0,
  ERROR = 1,
  NORMAL = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

interface LogEntry {
  timestamp: number;
  level: string;
  context: string;
  message: string;
  args: unknown[];
}

// Map old numeric levels to new enum for backwards compatibility
const LOG_LEVEL = environment.production ? LogLevel.DEBUG : LogLevel.NORMAL;

// IMPORTANT: All Log class methods and context loggers (SyncLog, etc.) record logs to history
// for later export. The trade-off is that line numbers will show log.ts instead of the
// actual calling location. This is a fundamental limitation of JavaScript - any wrapper
// function breaks line number preservation.
//
// Available logging methods:
// 1. Direct console.log() - preserves line numbers but NO recording
// 2. Log.normal() etc - records to history (shows log.ts line numbers)
// 3. SyncLog.error() etc - records to history with context (shows log.ts line numbers)

/**
 * Modern logging class that preserves line numbers using pre-bound console methods
 */
export class Log {
  /** Current log level threshold */
  private static level: LogLevel = LOG_LEVEL;

  /** Current context string */
  private static context: string = '';

  /** Array to store log entries for download */
  private static logHistory: LogEntry[] = [];

  /** Maximum number of log entries to keep in memory */
  private static maxHistorySize: number = 1000;

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

  /** Record log entry to history */
  private static recordLog(level: string, context: string, args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message: args.length > 0 ? String(args[0]) : '',
      args: args.slice(1),
    };

    this.logHistory.push(entry);

    // Keep history size under control
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  static critical(...args: unknown[]): void {
    // Critical always logs (level 0)
    this.recordLog('CRITICAL', this.context, args);
    this.c(this.getPrefix(), ...args);
  }

  static error(...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      this.recordLog('ERROR', this.context, args);
      this.e(this.getPrefix(), ...args);
    }
  }

  static normal(...args: unknown[]): void {
    if (this.level >= LogLevel.NORMAL) {
      this.recordLog('NORMAL', this.context, args);
      this.n(this.getPrefix(), ...args);
    }
  }

  static verbose(...args: unknown[]): void {
    if (this.level >= LogLevel.VERBOSE) {
      this.recordLog('VERBOSE', this.context, args);
      this.v(this.getPrefix(), ...args);
    }
  }

  static debug(...args: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      this.recordLog('DEBUG', this.context, args);
      this.d(this.getPrefix(), ...args);
    }
  }

  // Backwards compatibility aliases
  static log = Log.normal;
  static info = Log.normal;
  static warn = Log.error;

  /** Get the current log history */
  static getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /** Clear the log history */
  static clearLogHistory(): void {
    this.logHistory = [];
  }

  /** Export log history as JSON string for download */
  static exportLogHistory(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /** Export log history as formatted text for download */
  static exportLogHistoryAsText(): string {
    return this.logHistory
      .map((entry) => {
        const date = new Date(entry.timestamp).toISOString();
        const context = entry.context ? `[${entry.context}] ` : '';
        const argsStr =
          entry.args.length > 0 ? ` ${entry.args.map(String).join(' ')}` : '';
        return `${date} [${entry.level}] ${context}${entry.message}${argsStr}`;
      })
      .join('\n');
  }

  /**
   * Create a new logger instance with a specific context
   * All logs are recorded to history for later export
   * @param context - The context string to prefix logs with
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

    // Return wrapper functions that always record logs
    return {
      critical: (...args: unknown[]) => {
        this.recordLog('CRITICAL', context, args);
        console.log(contextPrefix, ...args);
      },
      error: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.ERROR) {
          this.recordLog('ERROR', context, args);
          console.error(contextPrefix, ...args);
        }
      },
      normal: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.NORMAL) {
          this.recordLog('NORMAL', context, args);
          console.log(contextPrefix, ...args);
        }
      },
      verbose: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.VERBOSE) {
          this.recordLog('VERBOSE', context, args);
          console.log(contextPrefix, ...args);
        }
      },
      debug: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.DEBUG) {
          this.recordLog('DEBUG', context, args);
          console.debug(contextPrefix, ...args);
        }
      },
      // Aliases
      log: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.NORMAL) {
          this.recordLog('NORMAL', context, args);
          console.log(contextPrefix, ...args);
        }
      },
      info: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.NORMAL) {
          this.recordLog('INFO', context, args);
          console.info(contextPrefix, ...args);
        }
      },
      warn: (...args: unknown[]) => {
        if (LOG_LEVEL >= LogLevel.ERROR) {
          this.recordLog('WARN', context, args);
          console.warn(contextPrefix, ...args);
        }
      },
    };
  }
}

// Pre-configured logger instances for specific contexts
// All context loggers now record to history
export const SyncLog = Log.withContext('sync');
export const PluginLog = Log.withContext('plugin');
