import { inject, Injectable, Injector } from '@angular/core';
import { SnackService } from '../../core/snack/snack.service';
import { SyncProviderId } from '../../pfapi/api/pfapi.const';
import { SuperSyncProvider } from '../../pfapi/api/sync/providers/super-sync/super-sync';
import {
  RestoreCapable,
  RestorePoint,
} from '../../pfapi/api/sync/sync-provider.interface';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';
import { T } from '../../t.const';
import { PfapiService } from '../../pfapi/pfapi.service';

/**
 * Service for restoring state from Super Sync server history.
 * Uses the operation log stored on the server to reconstruct past states.
 */
@Injectable({ providedIn: 'root' })
export class SuperSyncRestoreService {
  private _injector = inject(Injector);
  private _snackService = inject(SnackService);

  // Lazy-loaded PfapiService to avoid potential circular dependency
  // We use Injector.get() instead of direct inject() to defer resolution
  private _pfapiService: PfapiService | null = null;
  private _getPfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }

  /**
   * Check if Super Sync restore is available.
   * Returns true if Super Sync is the active provider and is ready.
   */
  async isAvailable(): Promise<boolean> {
    const provider = this._getProvider();
    if (!provider) {
      return false;
    }
    return provider.isReady();
  }

  /**
   * Get available restore points from the server.
   * Returns a list of points in time that can be restored to.
   */
  async getRestorePoints(limit: number = 30): Promise<RestorePoint[]> {
    const provider = this._getRestoreCapableProvider();
    return provider.getRestorePoints(limit);
  }

  /**
   * Restore state to a specific point in time.
   * @param serverSeq The server sequence to restore to
   */
  async restoreToPoint(serverSeq: number): Promise<void> {
    const provider = this._getRestoreCapableProvider();

    try {
      // 1. Fetch state at the specified serverSeq
      const snapshot = await provider.getStateAtSeq(serverSeq);

      // 2. Import with isForceConflict=true to generate fresh vector clock
      // This ensures the restored state syncs cleanly to all devices
      await this._getPfapiService().importCompleteBackup(
        snapshot.state as AppDataCompleteNew,
        true, // isSkipLegacyWarnings
        true, // isSkipReload - no page reload needed
        true, // isForceConflict - generates fresh vector clock
      );

      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.SYNC.S.RESTORE_SUCCESS,
      });
    } catch (error) {
      console.error('Failed to restore from point:', error);
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.RESTORE_ERROR,
      });
      throw error;
    }
  }

  /**
   * Get the Super Sync provider if it's the active provider.
   */
  private _getProvider(): SuperSyncProvider | null {
    const provider = this._getPfapiService().pf.getActiveSyncProvider();
    if (!provider || provider.id !== SyncProviderId.SuperSync) {
      return null;
    }
    return provider as SuperSyncProvider;
  }

  /**
   * Get the provider and verify it supports restore operations.
   * Throws if Super Sync is not active.
   */
  private _getRestoreCapableProvider(): SuperSyncProvider & RestoreCapable {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error('Super Sync is not the active sync provider');
    }
    return provider;
  }
}
