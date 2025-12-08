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

/**
 * Maximum retry attempts for operations that fail during conflict resolution.
 * After this many retries across restarts, the operation is marked as rejected.
 */
export const MAX_CONFLICT_RETRY_ATTEMPTS = 5;

/**
 * Maximum age of remote operation files to keep during remote cleanup (milliseconds).
 * Files older than this will be deleted to prevent unbounded remote storage growth.
 * Should be >= COMPACTION_RETENTION_MS to ensure no data loss during sync gaps.
 * Default: 14 days (double local retention for safety margin)
 */
export const REMOTE_COMPACTION_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Maximum number of remote operation files to keep regardless of age.
 * Prevents deletion of recent files even if there are many.
 * Provides safety margin for high-frequency usage scenarios.
 */
export const MAX_REMOTE_FILES_TO_KEEP = 100;

/**
 * Maximum number of operations to be rejected before showing user warning.
 * Once this threshold is reached, user is notified about permanently failed ops.
 */
export const MAX_REJECTED_OPS_BEFORE_WARNING = 10;

/**
 * Threshold in bytes for logging a warning about large operation payloads.
 * Operations exceeding this size may indicate inefficient data patterns
 * and could impact sync performance and storage usage.
 * Default: 10KB
 */
export const LARGE_PAYLOAD_WARNING_THRESHOLD_BYTES = 10 * 1024;

/**
 * Maximum number of operations in a single batchUpdateForProject call.
 * Large batch operations are automatically chunked into smaller batches
 * to prevent oversized operation payloads.
 * Default: 50 operations per batch
 */
export const MAX_BATCH_OPERATIONS_SIZE = 50;

/**
 * Maximum age for pending operations before they expire and are rejected (milliseconds).
 * If an operation has been pending for longer than this (e.g., due to data corruption
 * or repeated crashes), it's marked as rejected instead of being replayed.
 * Default: 24 hours - enough time for legitimate recovery scenarios
 */
export const PENDING_OPERATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
