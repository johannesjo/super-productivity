import { InjectionToken } from '@angular/core';

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
 * Maximum operations to accumulate in memory during API download.
 * Prevents out-of-memory errors when syncing with users who have
 * millions of unsynced operations.
 */
export const MAX_DOWNLOAD_OPS_IN_MEMORY = 50000;

/**
 * Maximum iterations for the download loop.
 * Prevents infinite loops if server has a bug and always returns hasMore=true.
 * At 500 ops per page, this allows downloading up to 500,000 operations.
 */
export const MAX_DOWNLOAD_ITERATIONS = 1000;

/**
 * Maximum retry attempts for operations that fail during conflict resolution.
 * After this many retries across restarts, the operation is marked as rejected.
 */
export const MAX_CONFLICT_RETRY_ATTEMPTS = 5;

/**
 * Maximum number of operations to be rejected before showing user warning.
 * Once this threshold is reached, user is notified about permanently failed ops.
 */
export const MAX_REJECTED_OPS_BEFORE_WARNING = 10;

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

/**
 * Threshold for warning about clock drift between client and server (milliseconds).
 * If the client's clock differs from the server by more than this amount,
 * a warning is shown to the user as clock drift can affect conflict resolution.
 * Default: 5 minutes
 */
export const CLOCK_DRIFT_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Threshold for logging slow compaction operations (milliseconds).
 * Compaction metrics are only logged when duration exceeds this threshold
 * to avoid flooding logs during normal operation.
 * Default: 3 seconds
 */
export const SLOW_COMPACTION_THRESHOLD_MS = 3000;

/**
 * Threshold for warning about large state size during compaction (megabytes).
 * Large states may cause compaction to be slow or timeout.
 * Default: 20MB
 */
export const STATE_SIZE_WARNING_THRESHOLD_MB = 20;

/**
 * Injection token for retry delay base value (milliseconds).
 * Use this token to inject a different delay value in tests (e.g., 0 for instant retries).
 * Defaults to DOWNLOAD_RETRY_BASE_DELAY_MS if not provided.
 */
export const RETRY_DELAY_BASE_MS = new InjectionToken<number>('RETRY_DELAY_BASE_MS', {
  providedIn: 'root',
  factory: () => DOWNLOAD_RETRY_BASE_DELAY_MS,
});

/**
 * Duration in milliseconds to suppress selector-based effects after sync completes.
 * This prevents "repair" effects from creating redundant operations based on
 * freshly-synced state that looks like it needs repair.
 *
 * The timing gap problem:
 * 1. Tab gains focus → sync triggers
 * 2. Remote ops applied (isApplyingRemoteOps = true)
 * 3. Sync finishes, isApplyingRemoteOps = false
 * 4. Selectors re-evaluate with new state
 * 5. Effects fire and create operations that conflict with just-synced state
 *
 * This cooldown extends the suppression window to prevent step 5.
 * Default: 2 seconds
 */
export const POST_SYNC_COOLDOWN_MS = 2000;
