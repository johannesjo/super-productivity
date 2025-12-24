import { computed, Injectable, signal } from '@angular/core';

/**
 * Tracks Super Sync-specific status for the UI indicator.
 *
 * This service manages:
 * 1. Whether a successful remote check has completed since startup
 * 2. Whether there are pending local operations to upload
 *
 * The UI uses this to show:
 * - Single checkmark: sync is enabled and ready
 * - Double checkmark: no pending ops AND we've successfully synced with remote
 */
@Injectable({
  providedIn: 'root',
})
export class SuperSyncStatusService {
  // Has a successful remote check completed since startup?
  private _hasCompletedRemoteCheck = signal(false);

  // Are there pending local operations?
  private _hasPendingOps = signal(true);

  // Confirmed in sync = no pending ops AND we've successfully checked remote
  readonly isConfirmedInSync = computed(() => {
    return !this._hasPendingOps() && this._hasCompletedRemoteCheck();
  });

  /**
   * Called after successfully checking the remote server for updates.
   * This includes both cases where updates were found and where no updates were found.
   */
  markRemoteChecked(): void {
    this._hasCompletedRemoteCheck.set(true);
  }

  /**
   * Called when sync provider changes or is disabled.
   * Resets to default state.
   */
  clearScope(): void {
    this._hasCompletedRemoteCheck.set(false);
    this._hasPendingOps.set(true);
  }

  /**
   * Called after sync operations to update whether there are pending ops.
   */
  updatePendingOpsStatus(hasPending: boolean): void {
    this._hasPendingOps.set(hasPending);
  }
}
