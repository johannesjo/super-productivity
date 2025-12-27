import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import {
  ConflictResult,
  EntityConflict,
  Operation,
  OpType,
  VectorClock,
} from '../core/operation.types';
import { OpLog } from '../../core/log';
import { SyncProviderServiceInterface } from '../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../pfapi/api/pfapi.const';
import { isOperationSyncCapable } from './operation-sync.util';
import { OperationApplierService } from '../apply/operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from '../validation/validate-state.service';
import { OperationLogUploadService, UploadResult } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { VectorClockService } from './vector-clock.service';
import {
  MAX_VERSION_SKIP,
  SchemaMigrationService,
} from '../store/schema-migration.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { PfapiService } from '../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../pfapi/pfapi-store-delegate.service';
import { lazyInject } from '../../util/lazy-inject';
import { LOCK_NAMES, MAX_REJECTED_OPS_BEFORE_WARNING } from '../core/operation-log.const';
import { CLIENT_ID_PROVIDER } from '../util/client-id.provider';
import { LockService } from './lock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
import { SuperSyncStatusService } from './super-sync-status.service';
import { SyncImportFilterService } from './sync-import-filter.service';
import { ServerMigrationService } from './server-migration.service';
import { OperationWriteFlushService } from './operation-write-flush.service';
import { StaleOperationResolverService } from './stale-operation-resolver.service';

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
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private operationApplier = inject(OperationApplierService);
  private conflictResolutionService = inject(ConflictResolutionService);
  private validateStateService = inject(ValidateStateService);
  private uploadService = inject(OperationLogUploadService);
  private downloadService = inject(OperationLogDownloadService);
  private vectorClockService = inject(VectorClockService);
  private schemaMigrationService = inject(SchemaMigrationService);
  private snackService = inject(SnackService);
  private translateService = inject(TranslateService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private lockService = inject(LockService);
  private compactionService = inject(OperationLogCompactionService);
  private superSyncStatusService = inject(SuperSyncStatusService);
  private syncImportFilterService = inject(SyncImportFilterService);
  private serverMigrationService = inject(ServerMigrationService);
  private writeFlushService = inject(OperationWriteFlushService);
  private staleOperationResolver = inject(StaleOperationResolverService);
  private clientIdProvider = inject(CLIENT_ID_PROVIDER);

  // Lazy injection to break circular dependency for getActiveSyncProvider():
  // PfapiService -> Pfapi -> OperationLogSyncService -> PfapiService
  // Note: loadClientId() now uses CLIENT_ID_PROVIDER instead
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
    // even if _processRemoteOps throws. Otherwise rejected ops remain in pending
    // state and get re-uploaded infinitely.
    let localWinOpsCreated = 0;
    let mergedOpsFromRejection = 0;
    try {
      if (result.piggybackedOps.length > 0) {
        const processResult = await this._processRemoteOps(result.piggybackedOps);
        localWinOpsCreated = processResult.localWinOpsCreated;
      }
    } finally {
      // _handleRejectedOps may create merged ops for concurrent modifications
      // These need to be uploaded, so we add them to localWinOpsCreated
      mergedOpsFromRejection = await this._handleRejectedOps(
        result.rejectedOps,
        syncProvider,
      );
      localWinOpsCreated += mergedOpsFromRejection;
    }

    // Update pending ops status for UI indicator
    const pendingOps = await this.opLogStore.getUnsynced();
    this.superSyncStatusService.updatePendingOpsStatus(pendingOps.length > 0);

    return { ...result, localWinOpsCreated };
  }

  /**
   * Handles operations that were rejected by the server.
   *
   * This is called AFTER processing piggybacked ops to ensure that:
   * 1. Conflicts are detected properly (local ops still in pending list)
   * 2. User has had a chance to resolve conflicts via the dialog
   * 3. Only ops that weren't resolved via conflict dialog get marked rejected
   *
   * Special handling for CONCURRENT MODIFICATION rejections:
   * - These indicate the server has a conflicting operation from another client
   * - We try to download any new ops first
   * - If download returns new ops, conflict detection happens automatically
   * - If download returns nothing (we already have the conflicting ops), we:
   *   1. Mark the old pending ops as rejected
   *   2. Create NEW ops with current state and merged vector clocks
   *   3. The new ops will be uploaded on next sync cycle
   *
   * @param rejectedOps - Operations rejected by the server with error messages
   * @param syncProvider - The active sync provider (needed to trigger download)
   * @returns Number of merged ops created (caller should trigger follow-up upload if > 0)
   */
  private async _handleRejectedOps(
    rejectedOps: Array<{ opId: string; error?: string; errorCode?: string }>,
    syncProvider?: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<number> {
    if (rejectedOps.length === 0) {
      return 0;
    }

    let mergedOpsCreated = 0;

    // Separate concurrent modification rejections from permanent failures
    // For concurrent mods, we collect the full operation for later processing
    const concurrentModificationOps: Array<{ opId: string; op: Operation }> = [];
    const permanentlyRejectedOps: string[] = [];

    for (const rejected of rejectedOps) {
      // Check for storage quota exceeded - show strong alert and skip marking as rejected
      // This is a critical error that requires user action
      if (rejected.errorCode === 'STORAGE_QUOTA_EXCEEDED') {
        OpLog.error(`OperationLogSyncService: Storage quota exceeded - sync is broken!`);
        alert(
          'Sync storage is full! Your data is NOT syncing to the server. ' +
            'Please archive old tasks or upgrade your plan to continue syncing.',
        );
        // Don't mark as rejected - user needs to take action to fix storage
        continue;
      }

      // INTERNAL_ERROR = transient server error (transaction rollback, DB issue, etc.)
      // These should be retried on next sync, not permanently rejected
      if (rejected.errorCode === 'INTERNAL_ERROR') {
        OpLog.warn(
          `OperationLogSyncService: Transient error for op ${rejected.opId}, will retry: ${rejected.error || 'unknown'}`,
        );
        continue;
      }

      const entry = await this.opLogStore.getOpById(rejected.opId);
      // Skip if:
      // - Op doesn't exist (was somehow removed)
      // - Op is already synced (was accepted after all)
      // - Op is already rejected (conflict resolution already handled it)
      if (!entry || entry.syncedAt || entry.rejectedAt) {
        continue;
      }

      // Check if this is a concurrent modification rejection
      // These happen when another client uploaded a conflicting operation.
      // Use errorCode for reliable detection (string matching is fragile).
      const isConcurrentModification = rejected.errorCode === 'CONFLICT_CONCURRENT';

      if (isConcurrentModification) {
        concurrentModificationOps.push({
          opId: rejected.opId,
          op: entry.op,
        });
        OpLog.warn(
          `OperationLogSyncService: Concurrent modification for ${entry.op.entityType}:${entry.op.entityId}, ` +
            `will resolve after download check`,
        );
      } else {
        permanentlyRejectedOps.push(rejected.opId);
        OpLog.normal(
          `OperationLogSyncService: Marking op ${rejected.opId} as rejected: ${rejected.error || 'unknown error'}`,
        );
      }
    }

    // Mark permanent rejections (validation errors, etc.) as rejected
    if (permanentlyRejectedOps.length > 0) {
      await this.opLogStore.markRejected(permanentlyRejectedOps);
      OpLog.normal(
        `OperationLogSyncService: Marked ${permanentlyRejectedOps.length} server-rejected ops as rejected`,
      );

      // Notify user if significant number of ops were rejected without conflict resolution
      if (permanentlyRejectedOps.length >= MAX_REJECTED_OPS_BEFORE_WARNING) {
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.UPLOAD_OPS_REJECTED,
          translateParams: { count: permanentlyRejectedOps.length },
        });
      }
    }

    // For concurrent modifications: try download first, then resolve locally if needed
    if (concurrentModificationOps.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: ${concurrentModificationOps.length} ops had concurrent modifications. ` +
          `Triggering download to check for new remote ops...`,
      );

      const provider = syncProvider || this._getPfapiService().pf.getActiveSyncProvider();
      if (provider && isOperationSyncCapable(provider)) {
        try {
          // Try to download new remote ops - if there are any, conflict detection will handle them
          const downloadResult = await this.downloadRemoteOps(provider);

          // Helper to check which ops are still pending
          const getStillPendingOps = async (): Promise<
            Array<{ opId: string; op: Operation }>
          > => {
            const pending: Array<{ opId: string; op: Operation }> = [];
            for (const { opId, op } of concurrentModificationOps) {
              const entry = await this.opLogStore.getOpById(opId);
              if (entry && !entry.syncedAt && !entry.rejectedAt) {
                pending.push({ opId, op });
              }
            }
            return pending;
          };

          // If download got new ops, conflict detection already happened in _processRemoteOps
          // If download got nothing (newOpsCount === 0), we need to resolve locally
          if (downloadResult.newOpsCount === 0) {
            const stillPendingOps = await getStillPendingOps();

            if (stillPendingOps.length > 0) {
              // Normal download returned 0 ops but concurrent ops still pending.
              // This means our local clock is likely missing entries the server has.
              // Try a FORCE download from seq 0 to get ALL op clocks.
              OpLog.warn(
                `OperationLogSyncService: Download returned no new ops but ${stillPendingOps.length} ` +
                  `concurrent ops still pending. Forcing full download from seq 0...`,
              );

              const forceDownloadResult = await this.downloadRemoteOps(provider, {
                forceFromSeq0: true,
              });

              // Use the clocks from force download to resolve stale ops
              if (
                forceDownloadResult.allOpClocks &&
                forceDownloadResult.allOpClocks.length > 0
              ) {
                OpLog.normal(
                  `OperationLogSyncService: Got ${forceDownloadResult.allOpClocks.length} clocks from force download`,
                );
                mergedOpsCreated +=
                  await this.staleOperationResolver.resolveStaleLocalOps(
                    stillPendingOps,
                    forceDownloadResult.allOpClocks,
                    forceDownloadResult.snapshotVectorClock,
                  );
              } else if (forceDownloadResult.snapshotVectorClock) {
                // Force download returned no individual clocks but we have snapshot clock
                OpLog.normal(
                  `OperationLogSyncService: Using snapshotVectorClock from force download`,
                );
                mergedOpsCreated +=
                  await this.staleOperationResolver.resolveStaleLocalOps(
                    stillPendingOps,
                    undefined,
                    forceDownloadResult.snapshotVectorClock,
                  );
              } else {
                // Force download returned no clocks but we have concurrent ops.
                // This is an unrecoverable edge case - cannot safely resolve without server clocks.
                // Mark ops as rejected to prevent infinite retry loop.
                OpLog.err(
                  `OperationLogSyncService: Force download returned no clocks. ` +
                    `Cannot safely resolve ${stillPendingOps.length} concurrent ops. Marking as rejected.`,
                );
                for (const { opId } of stillPendingOps) {
                  await this.opLogStore.markRejected([opId]);
                }
                this.snackService.open({
                  type: 'ERROR',
                  msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
                });
              }
            }
          } else {
            // Download got new ops - check if our pending ops were resolved by conflict detection
            const stillPendingOps = await getStillPendingOps();

            if (stillPendingOps.length > 0) {
              // Ops still pending after download - conflict detection didn't resolve them
              // This can happen if downloaded ops were for different entities
              OpLog.warn(
                `OperationLogSyncService: Download got ${downloadResult.newOpsCount} ops but ${stillPendingOps.length} ` +
                  `concurrent ops still pending. Resolving locally with merged clocks...`,
              );
              mergedOpsCreated += await this.staleOperationResolver.resolveStaleLocalOps(
                stillPendingOps,
                undefined,
                downloadResult.snapshotVectorClock,
              );
            }
          }
        } catch (e) {
          OpLog.err(
            'OperationLogSyncService: Failed to download after concurrent modification detection',
            e,
          );
        }
      }
    }

    return mergedOpsCreated;
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
      await this.serverMigrationService.handleServerMigration();
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

    const processResult = await this._processRemoteOps(result.newOps);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOTE OPS PROCESSING (Core Pipeline)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Core pipeline for processing remote operations.
   *
   * ## Processing Steps
   * 1. **Schema Migration** - Migrate ops to current schema version
   * 2. **SYNC_IMPORT Filtering** - Discard ops invalidated by full-state imports
   * 3. **Full-State Check** - Skip conflict detection for SYNC_IMPORT/BACKUP_IMPORT
   * 4. **Conflict Detection** - Compare vector clocks with local pending ops
   * 5. **Resolution/Application**:
   *    - If conflicts: Present dialog, piggyback non-conflicting ops
   *    - If no conflicts: Apply ops directly
   * 6. **Validation** - Checkpoint D: validate and repair state
   *
   * @param remoteOps - Operations received from remote storage
   * @returns Object indicating how many local-win ops were created during LWW resolution
   */
  private async _processRemoteOps(
    remoteOps: Operation[],
  ): Promise<{ localWinOpsCreated: number }> {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Schema Migration (Receiver-Side)
    // Migrate ops from older schema versions to current version.
    // Ops too new (beyond MAX_VERSION_SKIP) trigger an update prompt.
    // ─────────────────────────────────────────────────────────────────────────
    const currentVersion = this.schemaMigrationService.getCurrentVersion();
    const migratedOps: Operation[] = [];
    const droppedEntityIds = new Set<string>();
    let updateRequired = false;

    for (const op of remoteOps) {
      const opVersion = op.schemaVersion ?? 1;

      // Check if remote op is too new (exceeds supported skip)
      if (opVersion > currentVersion + MAX_VERSION_SKIP) {
        updateRequired = true;
        break;
      }

      try {
        const migrated = this.schemaMigrationService.migrateOperation(op);
        if (migrated) {
          migratedOps.push(migrated);
        } else {
          // Track dropped entity IDs for dependency warning
          if (op.entityId) {
            droppedEntityIds.add(op.entityId);
          }
          if (op.entityIds) {
            op.entityIds.forEach((id) => droppedEntityIds.add(id));
          }
          OpLog.verbose(
            `OperationLogSyncService: Dropped op ${op.id} (migrated to null)`,
          );
        }
      } catch (e) {
        OpLog.err(`OperationLogSyncService: Migration failed for op ${op.id}`, e);
        // We skip ops that fail migration, but if they are from a compatible version,
        // this indicates a bug or data corruption.
      }
    }

    if (updateRequired) {
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.VERSION_TOO_OLD,
        actionStr: T.PS.UPDATE_APP,
        actionFn: () => window.open('https://super-productivity.com/download', '_blank'),
      });
      return { localWinOpsCreated: 0 };
    }

    if (migratedOps.length === 0) {
      if (remoteOps.length > 0) {
        OpLog.normal(
          'OperationLogSyncService: All remote ops were dropped during migration.',
        );
      }
      return { localWinOpsCreated: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Filter ops invalidated by SYNC_IMPORT
    // When a full-state import happens, ops from OTHER clients created BEFORE the
    // import reference entities that were wiped. These must be discarded.
    // This also checks the LOCAL STORE for imports downloaded in previous sync cycles.
    // ─────────────────────────────────────────────────────────────────────────
    const { validOps, invalidatedOps } =
      await this.syncImportFilterService.filterOpsInvalidatedBySyncImport(migratedOps);

    if (invalidatedOps.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: Discarded ${invalidatedOps.length} ops invalidated by SYNC_IMPORT. ` +
          `These ops were created before the import and reference the old state.`,
        {
          discardedOpIds: invalidatedOps.map((op) => op.id),
          discardedActionTypes: invalidatedOps.map((op) => op.actionType),
        },
      );
    }

    if (validOps.length === 0) {
      OpLog.normal(
        'OperationLogSyncService: No valid ops to process after SYNC_IMPORT filtering.',
      );
      return { localWinOpsCreated: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Check for full-state operations (SYNC_IMPORT / BACKUP_IMPORT)
    // These replace the entire state, so conflict detection doesn't apply.
    // ─────────────────────────────────────────────────────────────────────────
    const hasFullStateOp = validOps.some(
      (op) => op.opType === OpType.SyncImport || op.opType === OpType.BackupImport,
    );

    if (hasFullStateOp) {
      OpLog.normal(
        'OperationLogSyncService: Full-state operation detected, skipping conflict detection.',
      );
      await this._applyNonConflictingOps(validOps);

      // Clean Slate Semantics: SYNC_IMPORT/BACKUP_IMPORT replaces entire state.
      // Local synced ops are NOT replayed - the import is an explicit user action
      // to restore all clients to a specific point in time.

      await this._validateAfterSync();
      return { localWinOpsCreated: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Conflict Detection
    // Compare remote ops against local pending ops using vector clocks.
    // NOTE: A client with 0 pending ops can still have an entity frontier from
    // already-synced ops. The frontier tracks ALL applied ops, not just pending.
    // ─────────────────────────────────────────────────────────────────────────

    // CRITICAL: Acquire the same lock used by writeOperation effects.
    // This ensures:
    // 1. All pending writes complete before we read (FIFO lock ordering)
    // 2. No NEW writes can start while we read the frontier, detect conflicts, AND apply resolutions
    // Without this, a race condition exists where a write could start after
    // reading the frontier but before conflict resolution/application completes,
    // causing the new write to be based on stale state.
    let result!: { localWinOpsCreated: number };
    await this.lockService.request(LOCK_NAMES.OPERATION_LOG, async () => {
      const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
      const conflictResult = await this._detectConflicts(
        validOps,
        appliedFrontierByEntity,
      );
      const { nonConflicting, conflicts } = conflictResult;

      // ─────────────────────────────────────────────────────────────────────────
      // STEP 5: Handle Results - Auto-Resolve Conflicts with LWW
      // IMPORTANT: If conflicts exist, we must NOT apply non-conflicting ops first.
      // They may depend on entities in the conflict (e.g., Task depends on Project).
      // Instead, piggyback them to ConflictResolutionService for batched application.
      // ─────────────────────────────────────────────────────────────────────────
      if (conflicts.length > 0) {
        OpLog.warn(
          `OperationLogSyncService: Detected ${conflicts.length} conflicts. Auto-resolving with LWW.`,
          conflicts,
        );
        // Auto-resolve conflicts using Last-Write-Wins strategy
        // Piggyback non-conflicting ops so they're applied with resolved conflicts
        result = await this.conflictResolutionService.autoResolveConflictsLWW(
          conflicts,
          nonConflicting,
        );
        return;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // STEP 6: No Conflicts - Apply directly and validate
      // ─────────────────────────────────────────────────────────────────────────
      if (nonConflicting.length > 0) {
        await this._applyNonConflictingOps(nonConflicting, true);
        await this._validateAfterSync(true); // Inside sp_op_log lock
      }
      result = { localWinOpsCreated: 0 };
    });
    return result;
  }

  /**
   * Applies non-conflicting operations with crash-safe tracking.
   *
   * ## Crash Safety Protocol
   * 1. Store ops with `pendingApply: true` flag
   * 2. Apply ops to NgRx store
   * 3. Mark ops as applied (removes pendingApply flag)
   *
   * If crash occurs between steps 1-2, ops will be retried on startup.
   * If crash occurs between steps 2-3, ops may be re-applied (idempotent).
   *
   * @param ops - Non-conflicting operations to apply
   * @param callerHoldsLock - If true, skip lock acquisition in repair operation.
   *        Pass true when calling from within the sp_op_log lock.
   * @throws Re-throws if application fails (ops marked as failed first)
   */
  private async _applyNonConflictingOps(
    ops: Operation[],
    callerHoldsLock: boolean = false,
  ): Promise<void> {
    // Map op ID to seq for marking partial success
    const opIdToSeq = new Map<string, number>();

    // Filter out duplicates in a single batch (more efficient than N individual hasOp calls)
    const opsToApply = await this.opLogStore.filterNewOps(ops);
    const duplicateCount = ops.length - opsToApply.length;
    if (duplicateCount > 0) {
      OpLog.verbose(
        `OperationLogSyncService: Skipping ${duplicateCount} duplicate op(s)`,
      );
    }

    // Store operations with pending status before applying
    // If we crash after storing but before applying, these will be retried on startup
    for (const op of opsToApply) {
      const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
      opIdToSeq.set(op.id, seq);
    }

    // Apply only NON-duplicate ops to NgRx store
    if (opsToApply.length > 0) {
      const result = await this.operationApplier.applyOperations(opsToApply);

      // Mark successfully applied ops
      const appliedSeqs = result.appliedOps
        .map((op) => opIdToSeq.get(op.id))
        .filter((seq): seq is number => seq !== undefined);

      if (appliedSeqs.length > 0) {
        await this.opLogStore.markApplied(appliedSeqs);

        // CRITICAL: Merge remote ops' vector clocks into local clock.
        // This ensures subsequent local operations have clocks that "dominate"
        // the remote ops (GREATER_THAN instead of CONCURRENT).
        // Without this, ops created after a SYNC_IMPORT would be incorrectly
        // filtered by SyncImportFilterService as "invalidated by import".
        await this.opLogStore.mergeRemoteOpClocks(result.appliedOps);

        OpLog.normal(
          `OperationLogSyncService: Applied and marked ${appliedSeqs.length} remote ops`,
        );
      }

      // Handle partial failure
      if (result.failedOp) {
        // Find all ops that weren't applied (failed op + remaining ops)
        const failedOpIndex = opsToApply.findIndex(
          (op) => op.id === result.failedOp!.op.id,
        );
        const failedOps = opsToApply.slice(failedOpIndex);
        const failedOpIds = failedOps.map((op) => op.id);

        OpLog.err(
          `OperationLogSyncService: ${result.appliedOps.length} ops applied before failure. ` +
            `Marking ${failedOpIds.length} ops as failed.`,
          result.failedOp.error,
        );
        await this.opLogStore.markFailed(failedOpIds);

        // Run validation after partial failure to detect/repair any state inconsistencies
        await this.validateStateService.validateAndRepairCurrentState(
          'partial-apply-failure',
          { callerHoldsLock },
        );

        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.PARTIAL_APPLY_FAILURE,
        });

        // Re-throw if it's a SyncStateCorruptedError, otherwise wrap it
        throw result.failedOp.error;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detects conflicts between remote operations and local pending operations.
   *
   * ## How It Works
   * For each remote op, we compare its vector clock against the local "frontier"
   * (merged clock of all applied + pending ops for that entity).
   *
   * ## Vector Clock Comparison Results
   * | Result       | Meaning                        | Action                    |
   * |--------------|--------------------------------|---------------------------|
   * | LESS_THAN    | Remote is newer                | Apply (non-conflicting)   |
   * | GREATER_THAN | Local is newer (remote stale)  | Skip remote op            |
   * | EQUAL        | Same op (duplicate)            | Skip remote op            |
   * | CONCURRENT   | True conflict                  | Add to conflicts list     |
   *
   * ## Fast Path Optimization
   * If an entity has no local PENDING ops, there's no conflict possible.
   * Conflicts require concurrent modifications from both sides.
   *
   * @param remoteOps - Remote operations to check for conflicts
   * @param appliedFrontierByEntity - Per-entity vector clocks of applied ops
   * @returns Object with `nonConflicting` ops to apply and `conflicts` to resolve
   */
  private async _detectConflicts(
    remoteOps: Operation[],
    appliedFrontierByEntity: Map<string, VectorClock>,
  ): Promise<ConflictResult> {
    const localPendingOpsByEntity = await this.opLogStore.getUnsyncedByEntity();
    const conflicts: EntityConflict[] = [];
    const nonConflicting: Operation[] = [];

    // Get the snapshot vector clock as a fallback for entities not in the frontier map
    const snapshotVectorClock = await this.vectorClockService.getSnapshotVectorClock();
    const hasNoSnapshotClock =
      !snapshotVectorClock || Object.keys(snapshotVectorClock).length === 0;

    // Get snapshot entity keys to distinguish entities that existed at compaction time
    const snapshotEntityKeys = await this.vectorClockService.getSnapshotEntityKeys();

    // Handle old snapshot format migration
    this._handleOldSnapshotFormat(snapshotEntityKeys);

    // PERF: Process in batches and yield to event loop to prevent UI hangs
    const CONFLICT_CHECK_BATCH_SIZE = 100;
    for (let i = 0; i < remoteOps.length; i++) {
      const remoteOp = remoteOps[i];
      const result = this.conflictResolutionService.checkOpForConflicts(remoteOp, {
        localPendingOpsByEntity,
        appliedFrontierByEntity,
        snapshotVectorClock,
        snapshotEntityKeys,
        hasNoSnapshotClock,
      });

      if (result.conflict) {
        conflicts.push(result.conflict);
      } else if (!result.isStaleOrDuplicate) {
        nonConflicting.push(remoteOp);
      }

      // Yield to event loop after each batch to keep UI responsive
      if ((i + 1) % CONFLICT_CHECK_BATCH_SIZE === 0 && i + 1 < remoteOps.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return { nonConflicting, conflicts };
  }

  /**
   * Handles old snapshot format by triggering compaction asynchronously.
   */
  private _handleOldSnapshotFormat(snapshotEntityKeys: Set<string> | undefined): void {
    if (snapshotEntityKeys === undefined) {
      OpLog.warn(
        'OperationLogSyncService: Old snapshot format detected - missing snapshotEntityKeys. Triggering compaction.',
      );
      this.compactionService.compact().catch((err) => {
        OpLog.err('OperationLogSyncService: Failed to compact old snapshot', err);
      });
    }
  }

  /**
   * CHECKPOINT D: Validates state after applying remote operations.
   * If validation fails, attempts repair and creates a REPAIR operation.
   *
   * @param callerHoldsLock - If true, skip lock acquisition in repair operation.
   *        Pass true when calling from within the sp_op_log lock.
   */
  private async _validateAfterSync(callerHoldsLock: boolean = false): Promise<void> {
    await this.validateStateService.validateAndRepairCurrentState('sync', {
      callerHoldsLock,
    });
  }
}
