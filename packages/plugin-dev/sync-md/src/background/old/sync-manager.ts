/**
 * Simple sync manager that handles sync operations and state
 */

import { SyncCoordinator } from './sync-coordinator';
import {
  SYNC_DEBOUNCE_TIME_FOCUSED,
  SYNC_DEBOUNCE_TIME_UNFOCUSED,
  MIN_SYNC_INTERVAL,
  LOG_PREFIX,
} from './config.const';

export class SyncManager {
  private syncCoordinator: SyncCoordinator = new SyncCoordinator();
  private syncDebounceTimer: unknown = null;
  private lastSyncTime = 0;
  private syncInProgress = false;
  private pendingSyncReason: string | null = null;
  private isWindowFocused = true;

  setWindowFocused(focused: boolean): void {
    this.isWindowFocused = focused;
  }

  async requestSync(reason: string): Promise<void> {
    console.log(`${LOG_PREFIX.SYNC} Request sync: ${reason}`);
    this.pendingSyncReason = reason;

    if (this.syncInProgress) {
      console.log(`${LOG_PREFIX.SYNC} Sync in progress, queuing`);
      return;
    }

    // Clear existing timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer as number);
    }

    // Schedule sync
    const debounceTime = this.isWindowFocused
      ? SYNC_DEBOUNCE_TIME_FOCUSED
      : SYNC_DEBOUNCE_TIME_UNFOCUSED;

    this.syncDebounceTimer = setTimeout(() => this.performSync(), debounceTime);
  }

  handleFileChange(modifiedTime: number): void {
    if (this.syncCoordinator?.isOwnWrite(modifiedTime)) {
      console.log(`${LOG_PREFIX.SYNC} Ignoring own write`);
      this.syncCoordinator.checkIntegrity().then((result) => {
        if (!result.success) {
          PluginAPI.showSnack({
            msg: `Integrity check failed: ${result.error}`,
            type: 'ERROR',
          });
        }
      });
      return;
    }

    this.requestSync('File changed');
  }

  private async performSync(): Promise<void> {
    if (!this.syncCoordinator) {
      console.log(`${LOG_PREFIX.SYNC} No coordinator`);
      return;
    }

    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync < MIN_SYNC_INTERVAL && this.lastSyncTime > 0) {
      setTimeout(() => this.performSync(), MIN_SYNC_INTERVAL - timeSinceLastSync);
      return;
    }

    this.syncInProgress = true;
    const reason = this.pendingSyncReason || 'Unknown';
    this.pendingSyncReason = null;

    try {
      console.log(`${LOG_PREFIX.SYNC} Performing sync: ${reason}`);

      if (reason.includes('File changed')) {
        const result = await this.syncCoordinator.syncFileToSP();
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await this.syncCoordinator.syncSPToFile();
        if (!result.success) throw new Error(result.error);

        // Check integrity after write
        const integrityResult = await this.syncCoordinator.checkIntegrity();
        if (!integrityResult.success) {
          console.error(
            `${LOG_PREFIX.SYNC} Integrity check failed:`,
            integrityResult.error,
          );
          PluginAPI.showSnack({
            msg: `Integrity check failed: ${integrityResult.error}`,
            type: 'ERROR',
          });
        }
      }

      this.lastSyncTime = Date.now();
      console.log(`${LOG_PREFIX.SYNC} Sync completed`);
    } catch (error) {
      console.error(`${LOG_PREFIX.SYNC} Sync error:`, error);
      PluginAPI.showSnack({
        msg: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'ERROR',
      });
    } finally {
      this.syncInProgress = false;

      if (this.pendingSyncReason) {
        setTimeout(() => this.performSync(), 1000);
      }
    }
  }
}
