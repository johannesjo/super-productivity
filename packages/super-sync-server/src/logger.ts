const getTimestamp = (): string => new Date().toISOString();

export interface AuditLogEntry {
  event: string;
  userId: number;
  clientId?: string;
  opId?: string;
  entityType?: string;
  entityId?: string;
  errorCode?: string;
  reason?: string;
  ip?: string;
  [key: string]: unknown;
}

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

  /**
   * Structured audit log for security-relevant events.
   * Outputs JSON for easy parsing by log aggregation tools.
   *
   * Events:
   * - OP_REJECTED: Operation was rejected (validation, conflict, etc.)
   * - RATE_LIMITED: User hit rate limit
   * - AUTH_FAILED: Authentication attempt failed
   * - SUSPICIOUS_REQUEST: Request contained suspicious data
   */
  audit: (entry: AuditLogEntry): void => {
    const logEntry = {
      timestamp: getTimestamp(),
      level: 'AUDIT',
      ...entry,
    };
    console.log(JSON.stringify(logEntry));
  },
};
