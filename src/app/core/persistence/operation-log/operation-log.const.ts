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

/**
 * Maximum operations in the pending retry queue.
 * If exceeded, new operations are marked as failed immediately to prevent memory leaks.
 */
export const MAX_PENDING_QUEUE_SIZE = 1000;

/**
 * Maximum permanently failed operations to keep for debugging.
 * If exceeded, oldest failed operations are dropped to prevent memory leaks.
 */
export const MAX_FAILED_OPS_SIZE = 500;

/**
 * Maximum retry attempts for downloading operation files.
 * Transient network errors are retried with exponential backoff.
 */
export const MAX_DOWNLOAD_RETRIES = 3;

/**
 * Base delay for download retry exponential backoff (milliseconds).
 * Delays: 1s, 2s, 4s for retries 1, 2, 3.
 */
export const DOWNLOAD_RETRY_BASE_DELAY_MS = 1000;

/**
 * Delay after writing pending lock to allow storage events to propagate across tabs.
 * 50ms is sufficient for most browser storage event propagation.
 * Used in localStorage-based two-phase commit lock fallback.
 */
export const LOCK_STORAGE_PROPAGATION_DELAY_MS = 50;

/**
 * Final verification delay after upgrading to confirmed lock.
 * Shorter than propagation delay since we're just confirming our own write.
 * Used in localStorage-based two-phase commit lock fallback.
 */
export const LOCK_FINAL_VERIFICATION_DELAY_MS = 20;

/**
 * Maximum operations to accumulate in memory during API download.
 * Prevents out-of-memory errors when syncing with users who have
 * millions of unsynced operations.
 */
export const MAX_DOWNLOAD_OPS_IN_MEMORY = 50000;
