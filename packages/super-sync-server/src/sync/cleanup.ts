import { getSyncService } from './sync.service';
import { Logger } from '../logger';
import {
  DEFAULT_SYNC_CONFIG,
  STALE_DEVICE_THRESHOLD_MS,
  MS_PER_HOUR,
  MS_PER_DAY,
} from './sync.types';

// Cleanup intervals
const TOMBSTONE_CLEANUP_INTERVAL = MS_PER_DAY; // Daily
const OLD_OPS_CLEANUP_INTERVAL = MS_PER_DAY; // Daily
const STALE_DEVICES_CLEANUP_INTERVAL = MS_PER_HOUR; // Hourly
const RATE_LIMIT_CLEANUP_INTERVAL = MS_PER_HOUR; // Hourly
const REQUEST_DEDUP_CLEANUP_INTERVAL = MS_PER_HOUR; // Hourly

let tombstoneCleanupTimer: NodeJS.Timeout | null = null;
let oldOpsCleanupTimer: NodeJS.Timeout | null = null;
let staleDevicesCleanupTimer: NodeJS.Timeout | null = null;
let rateLimitCleanupTimer: NodeJS.Timeout | null = null;
let requestDedupCleanupTimer: NodeJS.Timeout | null = null;

/**
 * Clean up expired tombstones
 */
function cleanupExpiredTombstones(): void {
  try {
    const syncService = getSyncService();
    const deleted = syncService.deleteExpiredTombstones();
    if (deleted > 0) {
      Logger.info(`Tombstone cleanup: deleted ${deleted} expired tombstones`);
    }
  } catch (error) {
    Logger.error(`Tombstone cleanup failed: ${error}`);
  }
}

/**
 * Clean up old operations that have been acknowledged by all devices.
 * Uses a single batch query to avoid N+1 database queries.
 */
function cleanupOldOperations(): void {
  try {
    const syncService = getSyncService();
    const cutoffTime = Date.now() - DEFAULT_SYNC_CONFIG.opRetentionMs;

    // Use batch cleanup to avoid N+1 queries
    const totalDeleted = syncService.deleteOldSyncedOpsForAllUsers(cutoffTime);

    if (totalDeleted > 0) {
      Logger.info(`Old operations cleanup: deleted ${totalDeleted} operations`);
    }
  } catch (error) {
    Logger.error(`Old operations cleanup failed: ${error}`);
  }
}

/**
 * Clean up stale devices (not seen in 30 days)
 */
function cleanupStaleDevices(): void {
  try {
    const syncService = getSyncService();
    const staleThreshold = Date.now() - STALE_DEVICE_THRESHOLD_MS;

    const deleted = syncService.deleteStaleDevices(staleThreshold);
    if (deleted > 0) {
      Logger.info(`Stale device cleanup: removed ${deleted} devices`);
    }
  } catch (error) {
    Logger.error(`Stale device cleanup failed: ${error}`);
  }
}

/**
 * Clean up expired rate limit counters to prevent memory leaks
 */
function cleanupRateLimitCounters(): void {
  try {
    const syncService = getSyncService();
    const cleaned = syncService.cleanupExpiredRateLimitCounters();
    if (cleaned > 0) {
      Logger.info(`Rate limit cleanup: removed ${cleaned} expired counters`);
    }
  } catch (error) {
    Logger.error(`Rate limit cleanup failed: ${error}`);
  }
}

/**
 * Clean up expired request deduplication entries to prevent memory leaks
 */
function cleanupRequestDedupEntries(): void {
  try {
    const syncService = getSyncService();
    const cleaned = syncService.cleanupExpiredRequestDedupEntries();
    if (cleaned > 0) {
      Logger.info(`Request dedup cleanup: removed ${cleaned} expired entries`);
    }
  } catch (error) {
    Logger.error(`Request dedup cleanup failed: ${error}`);
  }
}

/**
 * Start all cleanup jobs
 */
export function startCleanupJobs(): void {
  Logger.info('Starting sync cleanup jobs...');

  // Run initial cleanup after a short delay
  setTimeout(() => {
    cleanupExpiredTombstones();
    cleanupOldOperations();
    cleanupStaleDevices();
    cleanupRateLimitCounters();
    cleanupRequestDedupEntries();
  }, 10_000);

  // Schedule recurring jobs
  tombstoneCleanupTimer = setInterval(
    cleanupExpiredTombstones,
    TOMBSTONE_CLEANUP_INTERVAL,
  );

  oldOpsCleanupTimer = setInterval(cleanupOldOperations, OLD_OPS_CLEANUP_INTERVAL);

  staleDevicesCleanupTimer = setInterval(
    cleanupStaleDevices,
    STALE_DEVICES_CLEANUP_INTERVAL,
  );

  rateLimitCleanupTimer = setInterval(
    cleanupRateLimitCounters,
    RATE_LIMIT_CLEANUP_INTERVAL,
  );

  requestDedupCleanupTimer = setInterval(
    cleanupRequestDedupEntries,
    REQUEST_DEDUP_CLEANUP_INTERVAL,
  );

  Logger.info('Cleanup jobs scheduled');
}

/**
 * Stop all cleanup jobs
 */
export function stopCleanupJobs(): void {
  if (tombstoneCleanupTimer) {
    clearInterval(tombstoneCleanupTimer);
    tombstoneCleanupTimer = null;
  }
  if (oldOpsCleanupTimer) {
    clearInterval(oldOpsCleanupTimer);
    oldOpsCleanupTimer = null;
  }
  if (staleDevicesCleanupTimer) {
    clearInterval(staleDevicesCleanupTimer);
    staleDevicesCleanupTimer = null;
  }
  if (rateLimitCleanupTimer) {
    clearInterval(rateLimitCleanupTimer);
    rateLimitCleanupTimer = null;
  }
  if (requestDedupCleanupTimer) {
    clearInterval(requestDedupCleanupTimer);
    requestDedupCleanupTimer = null;
  }
  Logger.info('Cleanup jobs stopped');
}
