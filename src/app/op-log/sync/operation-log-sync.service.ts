import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClock } from '../core/operation.types';
import { OpLog } from '../../core/log';
import { SyncProviderServiceInterface } from '../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../pfapi/api/pfapi.const';
import { isOperationSyncCapable } from './operation-sync.util';
import { OperationLogUploadService, UploadResult } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { PfapiService } from '../../pfapi/pfapi.service';
import { lazyInject } from '../../util/lazy-inject';
import { SuperSyncStatusService } from './super-sync-status.service';
import { ServerMigrationService } from './server-migration.service';
import { OperationWriteFlushService } from './operation-write-flush.service';
import { RemoteOpsProcessingService } from './remote-ops-processing.service';
import {
  DownloadResultForRejection,
  RejectedOpsHandlerService,
} from './rejected-ops-handler.service';

/**
 * Orchestrates synchronization of the Operation Log with remote storage.
 *
 * ## Overview
 * This service is the main coordinator for syncing operations between clients.
 * It handles uploading local changes, downloading remote changes, detecting conflicts,
 * and ensuring data consistency across all clients.
 *
 * ## Sync Flow
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           UPLOAD FLOW                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Check if fresh client (block upload if no history)                 │
 * │  2. Upload pending ops via OperationLogUploadService                   │
 * │  3. Process piggybacked ops FIRST (triggers conflict detection)        │
 * │  4. Mark server-rejected ops as rejected                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          DOWNLOAD FLOW                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Download remote ops via OperationLogDownloadService                │
 * │  2. Fresh client? → Show confirmation dialog                           │
 * │  3. Process remote ops (_processRemoteOps)                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     PROCESS REMOTE OPS FLOW                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Schema migration (receiver-side)                                   │
 * │  2. Filter ops invalidated by SYNC_IMPORT                              │
 * │  3. Full-state op? → Skip conflict detection, apply directly           │
 * │  4. Conflict detection via vector clocks                               │
 * │  5. Conflicts? → Auto-resolve with LWW, piggyback non-conflicting ops  │
 * │  6. No conflicts? → Apply ops directly                                 │
 * │  7. Validate state (Checkpoint D)                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Key Concepts
 *
 * ### Piggybacked Operations
 * When uploading, the server may return ops from other clients in the same response.
 * These are processed BEFORE marking rejected ops so conflict detection works properly.
 *
 * ### Non-Conflicting Ops Piggybacking
 * When conflicts are detected, non-conflicting ops are passed to ConflictResolutionService
 * to be applied together with resolved conflicts. This ensures dependency sorting works
 * (e.g., Task depends on Project from a resolved conflict).
 *
 * ### Fresh Client Safety
 * A client with no history must download before uploading to prevent overwriting
 * valid remote data with empty state. Fresh clients also see a confirmation dialog.
 *
 * ## Delegated Services
 * - **OperationLogUploadService**: Handles server communication for uploads
 * - **OperationLogDownloadService**: Handles server communication for downloads
 * - **ConflictResolutionService**: Presents conflicts to user and applies resolutions
 * - **VectorClockService**: Manages vector clock state and entity frontiers
 * - **OperationApplierService**: Applies operations to NgRx store
 * - **ValidateStateService**: Validates and repairs state after sync (Checkpoint D)
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogSyncService {
  private opLogStore = inject(OperationLogStoreService);
  private uploadService = inject(OperationLogUploadService);
  private downloadService = inject(OperationLogDownloadService);
  private snackService = inject(SnackService);
  private translateService = inject(TranslateService);
  private superSyncStatusService = inject(SuperSyncStatusService);
  private serverMigrationService = inject(ServerMigrationService);
  private writeFlushService = inject(OperationWriteFlushService);

  // Extracted services
  private remoteOpsProcessingService = inject(RemoteOpsProcessingService);
  private rejectedOpsHandlerService = inject(RejectedOpsHandlerService);

  // Lazy injection to break circular dependency for getActiveSyncProvider():
  // PfapiService -> Pfapi -> OperationLogSyncService -> PfapiService
  private _injector = inject(Injector);
  private _getPfapiService = lazyInject(this._injector, PfapiService);

  /**
   * Checks if this client is "wholly fresh" - meaning it has never synced before
   * and has no local operation history. A fresh client accepting remote data
   * should require user confirmation to prevent accidental data loss.
   *
   * @returns true if this is a fresh client with no history
   */
  async isWhollyFreshClient(): Promise<boolean> {
    const snapshot = await this.opLogStore.loadStateCache();
    const lastSeq = await this.opLogStore.getLastSeq();

    // Fresh client: no snapshot AND no operations in the log
    return !snapshot && lastSeq === 0;
  }

  /**
   * Upload pending local operations to remote storage.
   * Any piggybacked operations received during upload are automatically processed.
   *
   * IMPORTANT: The order of operations is critical:
   * 1. Upload ops → server may reject some with CONFLICT_CONCURRENT
   * 2. Process piggybacked ops FIRST → triggers conflict detection with local pending ops
   * 3. THEN mark server-rejected ops as rejected (if not already resolved via conflict dialog)
   *
   * This order ensures users see conflict dialogs when the server rejects their changes,
   * rather than having their local changes silently discarded.
   *
   * SAFETY: A wholly fresh client (no snapshot, no operations) should NOT upload.
   * Fresh clients must first download and apply remote data before they can contribute.
   * This prevents scenarios where a fresh/empty client overwrites existing remote data.
   *
   * SERVER MIGRATION: When a client with history connects to an empty server for the
   * first time (server migration scenario), we create a SYNC_IMPORT with full state
   * before uploading regular ops. This ensures all data is transferred to the new server.
   */
  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<UploadResult | null> {
    // CRITICAL: Ensure all pending write operations have completed before uploading.
    // The effect that writes operations uses concatMap for sequential processing,
    // but if sync is triggered before all operations are written to IndexedDB,
    // we would upload an incomplete set. This flush waits for all queued writes.
    await this.writeFlushService.flushPendingWrites();

    // SAFETY: Block upload from wholly fresh clients
    // A fresh client has nothing meaningful to upload and uploading could overwrite
    // valid remote data with empty/default state.
    const isFresh = await this.isWhollyFreshClient();
    if (isFresh) {
      OpLog.warn(
        'OperationLogSyncService: Upload blocked - this is a fresh client with no history. ' +
          'Download remote data first before uploading.',
      );
      return null;
    }

    // SERVER MIGRATION CHECK: Passed as callback to execute INSIDE the upload lock.
    // This prevents race conditions where multiple tabs could both detect migration
    // and create duplicate SYNC_IMPORT operations.
    const result = await this.uploadService.uploadPendingOps(syncProvider, {
      preUploadCallback: () =>
        this.serverMigrationService.checkAndHandleMigration(syncProvider),
    });

    // STEP 1: Process piggybacked ops FIRST
    // This is critical: piggybacked ops may contain the "winning" remote versions
    // that caused our local ops to be rejected. By processing them first while our
    // local ops are still in the pending list, conflict detection will work properly
    // and the user will see a conflict dialog to choose which version to keep.
    //
    // STEP 2: Now handle server-rejected operations
    // At this point, conflicts have been detected and presented to the user.
    // We mark remaining rejected ops (those not already resolved via conflict dialog)
    // as rejected so they won't be re-uploaded.
    //
    // CRITICAL: Use try-finally to ensure rejected ops are ALWAYS handled,
    // even if processing throws. Otherwise rejected ops remain in pending
    // state and get re-uploaded infinitely.
    let localWinOpsCreated = 0;
    let mergedOpsFromRejection = 0;
    try {
      if (result.piggybackedOps.length > 0) {
        const processResult = await this.remoteOpsProcessingService.processRemoteOps(
          result.piggybackedOps,
        );
        localWinOpsCreated = processResult.localWinOpsCreated;
      }
    } finally {
      // handleRejectedOps may create merged ops for concurrent modifications
      // These need to be uploaded, so we add them to localWinOpsCreated
      // Pass a download callback so the handler can trigger downloads for concurrent mods
      const downloadCallback = (options?: {
        forceFromSeq0?: boolean;
      }): Promise<DownloadResultForRejection> =>
        this.downloadRemoteOps(syncProvider, options);
      mergedOpsFromRejection = await this.rejectedOpsHandlerService.handleRejectedOps(
        result.rejectedOps,
        downloadCallback,
      );
      localWinOpsCreated += mergedOpsFromRejection;
    }

    // Update pending ops status for UI indicator
    const pendingOps = await this.opLogStore.getUnsynced();
    this.superSyncStatusService.updatePendingOpsStatus(pendingOps.length > 0);

    return { ...result, localWinOpsCreated };
  }

  /**
   * Download and process remote operations from storage.
   * For fresh clients (no local history), shows a confirmation dialog before accepting remote data
   * to prevent accidental data overwrites.
   *
   * When server migration is detected (gap on empty server), triggers a full state upload
   * to ensure all local data is transferred to the new server.
   *
   * @param syncProvider - The sync provider to download from
   * @param options.forceFromSeq0 - Force download from seq 0 to rebuild clock state
   * @returns Result indicating whether server migration was handled (requires follow-up upload)
   *          and how many local-win ops were created during LWW resolution
   */
  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    options?: { forceFromSeq0?: boolean },
  ): Promise<{
    serverMigrationHandled: boolean;
    localWinOpsCreated: number;
    newOpsCount: number;
    allOpClocks?: VectorClock[];
    snapshotVectorClock?: VectorClock;
  }> {
    const result = await this.downloadService.downloadRemoteOps(syncProvider, options);

    // Server migration detected: gap on empty server
    // Create a SYNC_IMPORT operation with full local state to seed the new server
    if (result.needsFullStateUpload) {
      await this.serverMigrationService.handleServerMigration(syncProvider);
      // Persist lastServerSeq=0 for the migration case (server was reset)
      if (isOperationSyncCapable(syncProvider) && result.latestServerSeq !== undefined) {
        await syncProvider.setLastServerSeq(result.latestServerSeq);
      }
      // Return with flag indicating migration was handled - caller should upload the SYNC_IMPORT
      return { serverMigrationHandled: true, localWinOpsCreated: 0, newOpsCount: 0 };
    }

    if (result.newOps.length === 0) {
      OpLog.normal(
        'OperationLogSyncService: No new remote operations to process after download.',
      );
      // IMPORTANT: Persist lastServerSeq even when no ops - keeps client in sync with server.
      // This is safe because we're not storing any ops, so there's no risk of localStorage
      // getting ahead of IndexedDB.
      if (isOperationSyncCapable(syncProvider) && result.latestServerSeq !== undefined) {
        await syncProvider.setLastServerSeq(result.latestServerSeq);
      }
      return {
        serverMigrationHandled: false,
        localWinOpsCreated: 0,
        newOpsCount: 0,
        // Include all op clocks from forced download (even though no new ops)
        allOpClocks: result.allOpClocks,
        // Include snapshot vector clock for stale op resolution
        snapshotVectorClock: result.snapshotVectorClock,
      };
    }

    // SAFETY: Fresh client confirmation
    // If this is a wholly fresh client (no local data) receiving remote data for the first time,
    // show a confirmation dialog to prevent accidental data loss scenarios where a fresh client
    // could overwrite existing remote data.
    const isFreshClient = await this.isWhollyFreshClient();
    if (isFreshClient && result.newOps.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: Fresh client detected. Requesting confirmation before accepting ${result.newOps.length} remote ops.`,
      );

      const confirmed = this._showFreshClientSyncConfirmation(result.newOps.length);
      if (!confirmed) {
        OpLog.normal(
          'OperationLogSyncService: User cancelled fresh client sync. Remote data not applied.',
        );
        this.snackService.open({
          msg: T.F.SYNC.S.FRESH_CLIENT_SYNC_CANCELLED,
        });
        return { serverMigrationHandled: false, localWinOpsCreated: 0, newOpsCount: 0 };
      }

      OpLog.normal(
        'OperationLogSyncService: User confirmed fresh client sync. Proceeding with remote data.',
      );
    }

    const processResult = await this.remoteOpsProcessingService.processRemoteOps(
      result.newOps,
    );

    // IMPORTANT: Persist lastServerSeq AFTER ops are stored in IndexedDB.
    // This ensures localStorage and IndexedDB stay in sync. If we crash before this point,
    // lastServerSeq won't be updated, and the client will re-download the ops on next sync.
    // This is the correct behavior - better to re-download than to skip ops.
    if (isOperationSyncCapable(syncProvider) && result.latestServerSeq !== undefined) {
      await syncProvider.setLastServerSeq(result.latestServerSeq);
    }

    // Update pending ops status for UI indicator
    const pendingOps = await this.opLogStore.getUnsynced();
    this.superSyncStatusService.updatePendingOpsStatus(pendingOps.length > 0);

    return {
      serverMigrationHandled: false,
      localWinOpsCreated: processResult.localWinOpsCreated,
      newOpsCount: result.newOps.length,
      allOpClocks: result.allOpClocks,
      snapshotVectorClock: result.snapshotVectorClock,
    };
  }

  /**
   * Shows a confirmation dialog for fresh client sync.
   * Uses synchronous window.confirm() to prevent race conditions where
   * pending operations could be added during an async dialog.
   */
  private _showFreshClientSyncConfirmation(opCount: number): boolean {
    const title = this.translateService.instant(T.F.SYNC.D_FRESH_CLIENT_CONFIRM.TITLE);
    const message = this.translateService.instant(
      T.F.SYNC.D_FRESH_CLIENT_CONFIRM.MESSAGE,
      {
        count: opCount,
      },
    );
    return window.confirm(`${title}\n\n${message}`);
  }
}
