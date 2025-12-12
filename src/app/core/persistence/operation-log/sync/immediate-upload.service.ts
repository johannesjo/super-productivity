import { inject, Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, exhaustMap, filter } from 'rxjs/operators';
import { isOnline } from '../../../../util/is-online';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogSyncService } from './operation-log-sync.service';
import { isOperationSyncCapable } from './operation-sync.util';
import { OpLog } from '../../../log';

const IMMEDIATE_UPLOAD_DEBOUNCE_MS = 100;

/**
 * Uploads operations to SuperSync immediately after they're persisted to IndexedDB.
 *
 * This service provides near-real-time sync by uploading operations as they happen,
 * rather than waiting for periodic sync triggers. Features:
 *
 * - 100ms debounce to batch rapid operations
 * - Silent failure (normal sync will pick up pending ops)
 * - Shows checkmark on success without spinning the sync button
 * - Handles piggybacked operations from server responses
 *
 * Guards:
 * - Only uploads when online
 * - Only uploads when SuperSync (OperationSyncCapable) is active
 * - Skips when full sync is in progress
 * - Skips for fresh clients (no history)
 */
@Injectable({
  providedIn: 'root',
})
export class ImmediateUploadService implements OnDestroy {
  private _pfapiService = inject(PfapiService);
  private _uploadService = inject(OperationLogUploadService);
  private _syncService = inject(OperationLogSyncService);

  private _uploadTrigger$ = new Subject<void>();
  private _subscription: Subscription | null = null;
  private _isInitialized = false;

  /**
   * Initializes the immediate upload pipeline.
   * Call once after app initialization.
   */
  initialize(): void {
    if (this._subscription) {
      return; // Already initialized
    }

    this._subscription = this._uploadTrigger$
      .pipe(
        debounceTime(IMMEDIATE_UPLOAD_DEBOUNCE_MS),
        filter(() => this._canUpload()),
        exhaustMap(() => this._performUpload()),
      )
      .subscribe();

    this._isInitialized = true;
    OpLog.verbose('ImmediateUploadService: Initialized');
  }

  /**
   * Trigger an immediate upload attempt.
   * Called by OperationLogEffects after persisting an operation.
   */
  trigger(): void {
    if (this._isInitialized) {
      this._uploadTrigger$.next();
    }
  }

  /**
   * Synchronous guard checks before attempting upload.
   */
  private _canUpload(): boolean {
    // Must be online
    if (!isOnline()) {
      return false;
    }

    // Don't overlap with full sync
    if (this._pfapiService.pf.isSyncInProgress) {
      return false;
    }

    // Must have SuperSync active (operation-sync capable)
    const provider = this._pfapiService.pf.getActiveSyncProvider();
    if (!provider || !isOperationSyncCapable(provider)) {
      return false;
    }

    return true;
  }

  /**
   * Performs the immediate upload with all async checks and error handling.
   */
  private async _performUpload(): Promise<void> {
    const provider = this._pfapiService.pf.getActiveSyncProvider();
    if (!provider || !isOperationSyncCapable(provider)) {
      return;
    }

    // Check provider is ready (authenticated)
    if (!(await provider.isReady())) {
      OpLog.verbose('ImmediateUploadService: Provider not ready, skipping');
      return;
    }

    // Don't upload from fresh clients (no history) - use full sync first
    const isFresh = await this._syncService.isWhollyFreshClient();
    if (isFresh) {
      OpLog.verbose('ImmediateUploadService: Fresh client, skipping');
      return;
    }

    try {
      OpLog.verbose('ImmediateUploadService: Starting immediate upload...');

      const result = await this._uploadService.uploadPendingOps(provider);

      // Process piggybacked ops if any
      if (result.piggybackedOps.length > 0) {
        OpLog.normal(
          `ImmediateUploadService: Processing ${result.piggybackedOps.length} piggybacked ops`,
        );
        await this._syncService.processRemoteOps(result.piggybackedOps);
      }

      // Show checkmark (without spinning) on success
      if (result.uploadedCount > 0 || result.piggybackedOps.length > 0) {
        this._pfapiService.pf.ev.emit('syncStatusChange', 'IN_SYNC');
        OpLog.verbose(
          `ImmediateUploadService: Uploaded ${result.uploadedCount} ops immediately`,
        );
      }
    } catch (e) {
      // Silent failure - normal sync will pick up pending ops
      OpLog.warn(
        'ImmediateUploadService: Immediate upload failed, will retry on normal sync',
        e,
      );
      // Don't emit ERROR state - transient failures are expected
    }
  }

  ngOnDestroy(): void {
    this._subscription?.unsubscribe();
    this._subscription = null;
  }
}
