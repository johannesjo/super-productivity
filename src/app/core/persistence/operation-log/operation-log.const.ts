/**
 * Configuration constants for the Operation Log system.
 * Centralizes all tunable parameters for easier maintenance and documentation.
 */

/**
 * Number of operations before triggering automatic compaction.
 * Compaction reduces storage size by snapshotting state and removing old operations.
 */
export const COMPACTION_THRESHOLD = 500;

/**
 * Maximum consecutive compaction failures before notifying the user.
 * After this many failures, a warning is shown to prompt user action.
 */
export const MAX_COMPACTION_FAILURES = 3;

/**
 * Maximum retry attempts for operations with missing dependencies.
 * After this many retries, the operation is marked as permanently failed.
 */
export const MAX_DEPENDENCY_RETRY_ATTEMPTS = 3;

/**
 * Lock timeout for fallback localStorage-based locking (milliseconds).
 * Used when Web Locks API is not available.
 */
export const LOCK_TIMEOUT_MS = 30000;

/**
 * Maximum wait time to acquire a lock (milliseconds).
 * If lock cannot be acquired within this time, an error is thrown.
 */
export const LOCK_ACQUIRE_TIMEOUT_MS = 60000;

/**
 * Retention window for synced operations during compaction (milliseconds).
 * Operations older than this that have been synced will be deleted.
 * Default: 7 days
 */
export const COMPACTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Retention window for emergency compaction when storage quota is exceeded.
 * Uses a shorter window (1 day) to free up more space.
 */
export const EMERGENCY_COMPACTION_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum time allowed for compaction before aborting.
 * Should be safely under LOCK_TIMEOUT_MS to prevent lock expiration during compaction.
 * If compaction exceeds this, it aborts to prevent data corruption.
 */
export const COMPACTION_TIMEOUT_MS = 25000;
