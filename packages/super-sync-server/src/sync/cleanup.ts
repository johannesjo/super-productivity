import { getSyncService } from './sync.service';
import { Logger } from '../logger';
import { DEFAULT_SYNC_CONFIG } from './sync.types';

// Cleanup intervals
const TOMBSTONE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // Daily
const OLD_OPS_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // Daily
const STALE_DEVICES_CLEANUP_INTERVAL = 60 * 60 * 1000; // Hourly

let tombstoneCleanupTimer: NodeJS.Timeout | null = null;
let oldOpsCleanupTimer: NodeJS.Timeout | null = null;
let staleDevicesCleanupTimer: NodeJS.Timeout | null = null;

/**
 * Clean up expired tombstones
 */
async function cleanupExpiredTombstones(): Promise<void> {
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
 * Clean up old operations that have been acknowledged by all devices
 */
async function cleanupOldOperations(): Promise<void> {
  try {
    const syncService = getSyncService();
    const cutoffTime = Date.now() - DEFAULT_SYNC_CONFIG.opRetentionMs;
    const userIds = syncService.getAllUserIds();

    let totalDeleted = 0;

    for (const userId of userIds) {
      // Find minimum acknowledged sequence across all devices
      const minAckedSeq = syncService.getMinAckedSeq(userId);

      if (minAckedSeq === null) {
        // No devices have acknowledged - skip this user
        continue;
      }

      // Only delete operations that:
      // 1. Are older than cutoff time (90 days)
      // 2. Have been acknowledged by all devices (seq < minAckedSeq)
      const deleted = syncService.deleteOldSyncedOps(userId, minAckedSeq, cutoffTime);

      totalDeleted += deleted;
    }

    if (totalDeleted > 0) {
      Logger.info(`Old operations cleanup: deleted ${totalDeleted} operations`);
    }
  } catch (error) {
    Logger.error(`Old operations cleanup failed: ${error}`);
  }
}

/**
 * Clean up stale devices (not seen in 90 days)
 */
async function cleanupStaleDevices(): Promise<void> {
  try {
    const syncService = getSyncService();
    const staleThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

    const deleted = syncService.deleteStaleDevices(staleThreshold);
    if (deleted > 0) {
      Logger.info(`Stale device cleanup: removed ${deleted} devices`);
    }
  } catch (error) {
    Logger.error(`Stale device cleanup failed: ${error}`);
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
  Logger.info('Cleanup jobs stopped');
}
