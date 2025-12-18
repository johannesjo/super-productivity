import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import {
  ConflictResult,
  EntityConflict,
  EntityType,
  Operation,
  OpType,
  VectorClock,
} from '../operation.types';
import {
  compareVectorClocks,
  incrementVectorClock,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../../pfapi/api/util/vector-clock';
import { OpLog } from '../../../log';
import { SyncProviderServiceInterface } from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { isOperationSyncCapable } from './operation-sync.util';
import { OperationApplierService } from '../processing/operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { OperationLogUploadService, UploadResult } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { VectorClockService } from './vector-clock.service';
import { toEntityKey } from '../entity-key.util';
import {
  CURRENT_SCHEMA_VERSION,
  MAX_VERSION_SKIP,
  SchemaMigrationService,
} from '../store/schema-migration.service';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import {
  DependencyResolverService,
  OperationDependency,
} from './dependency-resolver.service';
import { sortOperationsByDependency } from '../processing/sort-operations-by-dependency.util';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { uuidv7 } from '../../../../util/uuid-v7';
import { lazyInject } from '../../../../util/lazy-inject';
import { MAX_REJECTED_OPS_BEFORE_WARNING } from '../operation-log.const';
import { LockService } from './lock.service';
import { OperationLogCompactionService } from '../store/operation-log-compaction.service';
import { SYSTEM_TAG_IDS } from '../../../../features/tag/tag.const';
import { SuperSyncStatusService } from './super-sync-status.service';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { AppDataCompleteNew } from '../../../../pfapi/pfapi-config';

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
  private dependencyResolver = inject(DependencyResolverService);
  private translateService = inject(TranslateService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private lockService = inject(LockService);
  private compactionService = inject(OperationLogCompactionService);
  private superSyncStatusService = inject(SuperSyncStatusService);

  // Lazy injection to break circular dependency:
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
      preUploadCallback: () => this._checkAndHandleServerMigration(syncProvider),
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
    rejectedOps: Array<{ opId: string; error?: string }>,
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
      const entry = await this.opLogStore.getOpById(rejected.opId);
      // Skip if:
      // - Op doesn't exist (was somehow removed)
      // - Op is already synced (was accepted after all)
      // - Op is already rejected (conflict resolution already handled it)
      if (!entry || entry.syncedAt || entry.rejectedAt) {
        continue;
      }

      // Check if this is a concurrent modification rejection
      // These happen when another client uploaded a conflicting operation
      const isConcurrentModification =
        rejected.error?.includes('Concurrent modification') ||
        rejected.error?.includes('CONFLICT_CONCURRENT');

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
                mergedOpsCreated += await this._resolveStaleLocalOps(
                  stillPendingOps,
                  forceDownloadResult.allOpClocks,
                );
              } else {
                // No extra clocks from force download, resolve with what we have
                mergedOpsCreated += await this._resolveStaleLocalOps(stillPendingOps);
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
              mergedOpsCreated += await this._resolveStaleLocalOps(stillPendingOps);
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
   * Resolves stale local ops that were rejected due to concurrent modification.
   *
   * When the server rejects ops because of concurrent clocks, but download returns nothing
   * (we already have the conflicting remote ops), we need to:
   * 1. Mark the old pending ops as rejected (their clocks are stale)
   * 2. Create NEW ops with the current entity state and merged vector clocks
   * 3. The new ops will be uploaded on next sync cycle
   *
   * @param staleOps - Operations that were rejected due to concurrent modification
   * @param extraClocks - Additional clocks to merge (from force download)
   * @returns Number of merged ops created
   */
  private async _resolveStaleLocalOps(
    staleOps: Array<{ opId: string; op: Operation }>,
    extraClocks?: VectorClock[],
  ): Promise<number> {
    const clientId = await this._getPfapiService().pf.metaModel.loadClientId();
    if (!clientId) {
      OpLog.err('OperationLogSyncService: Cannot resolve stale ops - no client ID');
      return 0;
    }

    // Get the GLOBAL vector clock which includes snapshot + all ops after
    // This ensures we have all known clocks, not just entity-specific ones
    let globalClock = await this.vectorClockService.getCurrentVectorClock();

    // If extra clocks were provided (from force download), merge them all
    // This helps recover from situations where our local clock is missing entries
    if (extraClocks && extraClocks.length > 0) {
      OpLog.normal(
        `OperationLogSyncService: Merging ${extraClocks.length} clocks from force download`,
      );
      for (const clock of extraClocks) {
        globalClock = mergeVectorClocks(globalClock, clock);
      }
    }

    // Group ops by entity to handle multiple ops for the same entity
    const opsByEntity = new Map<string, Array<{ opId: string; op: Operation }>>();
    for (const item of staleOps) {
      // Skip ops without entityId (shouldn't happen for entity-level ops)
      if (!item.op.entityId) {
        OpLog.warn(
          `OperationLogSyncService: Skipping stale op ${item.opId} - no entityId`,
        );
        continue;
      }
      const entityKey = toEntityKey(item.op.entityType, item.op.entityId);
      if (!opsByEntity.has(entityKey)) {
        opsByEntity.set(entityKey, []);
      }
      opsByEntity.get(entityKey)!.push(item);
    }

    const opsToReject: string[] = [];
    const newOpsCreated: Operation[] = [];

    for (const [entityKey, entityOps] of opsByEntity) {
      // Get the first op to determine entity type and ID
      const firstOp = entityOps[0].op;
      const entityType = firstOp.entityType;
      const entityId = firstOp.entityId!; // Non-null - we filtered out ops without entityId above

      // Start with the global clock to ensure we dominate ALL known ops
      // Then merge in the local pending ops' clocks
      let mergedClock: VectorClock = { ...globalClock };
      for (const { op } of entityOps) {
        mergedClock = mergeVectorClocks(mergedClock, op.vectorClock);
      }

      // Increment to create a clock that dominates everything
      const newClock = incrementVectorClock(mergedClock, clientId);

      // Get current entity state from NgRx store
      const entityState = await this._getCurrentEntityState(entityType, entityId);
      if (entityState === undefined) {
        OpLog.warn(
          `OperationLogSyncService: Cannot create update op - entity not found: ${entityKey}`,
        );
        // Still mark the ops as rejected
        opsToReject.push(...entityOps.map((e) => e.opId));
        continue;
      }

      // Create new UPDATE op with current state and merged clock
      const newOp: Operation = {
        id: uuidv7(),
        actionType: `[${entityType}] Merged Update`,
        opType: OpType.Update,
        entityType,
        entityId,
        payload: entityState,
        clientId,
        vectorClock: newClock,
        timestamp: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      newOpsCreated.push(newOp);
      opsToReject.push(...entityOps.map((e) => e.opId));

      OpLog.normal(
        `OperationLogSyncService: Created merged update op for ${entityKey}, ` +
          `replacing ${entityOps.length} stale op(s). New clock: ${JSON.stringify(newClock)}`,
      );
    }

    // Mark old ops as rejected
    if (opsToReject.length > 0) {
      await this.opLogStore.markRejected(opsToReject);
      OpLog.normal(
        `OperationLogSyncService: Marked ${opsToReject.length} stale ops as rejected`,
      );
    }

    // Append new ops to the log (will be uploaded on next sync)
    for (const op of newOpsCreated) {
      await this.opLogStore.append(op, 'local');
      OpLog.normal(
        `OperationLogSyncService: Appended merged update op ${op.id} for ${op.entityType}:${op.entityId}`,
      );
    }

    if (newOpsCreated.length > 0) {
      this.snackService.open({
        msg: T.F.SYNC.S.LWW_CONFLICTS_AUTO_RESOLVED,
        translateParams: {
          localWins: newOpsCreated.length,
          remoteWins: 0,
        },
      });
    }

    return newOpsCreated.length;
  }

  /**
   * Gets the current state of an entity from the NgRx store.
   */
  private async _getCurrentEntityState(
    entityType: EntityType,
    entityId: string,
  ): Promise<unknown | undefined> {
    return this.conflictResolutionService.getCurrentEntityState(entityType, entityId);
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
  }> {
    const result = await this.downloadService.downloadRemoteOps(syncProvider, options);

    // Server migration detected: gap on empty server
    // Create a SYNC_IMPORT operation with full local state to seed the new server
    if (result.needsFullStateUpload) {
      await this._handleServerMigration();
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

  /**
   * Check if we're connecting to a new/empty server and need to upload full state.
   *
   * This handles the server migration scenario:
   * - Client has PREVIOUSLY SYNCED operations (not just local ops)
   * - lastServerSeq is 0 for this server (first time connecting)
   * - Server is empty (latestSeq = 0)
   *
   * When detected, creates a SYNC_IMPORT with full state before regular ops are uploaded.
   *
   * IMPORTANT: A fresh client with only local (unsynced) ops is NOT a migration scenario.
   * Fresh clients should just upload their ops normally without creating a SYNC_IMPORT.
   */
  private async _checkAndHandleServerMigration(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    // Only check for operation-sync capable providers
    if (!isOperationSyncCapable(syncProvider)) {
      return;
    }

    // Check if lastServerSeq is 0 (first time connecting to this server)
    const lastServerSeq = await syncProvider.getLastServerSeq();
    if (lastServerSeq !== 0) {
      // We've synced with this server before, no migration needed
      return;
    }

    // Check if server is empty by doing a minimal download request
    const response = await syncProvider.downloadOps(0, undefined, 1);
    if (response.latestSeq !== 0) {
      // Server has data, this is not a migration scenario
      // (might be joining an existing sync group)
      return;
    }

    // CRITICAL: Check if this client has PREVIOUSLY synced operations.
    // A client that has never synced (only local ops) is NOT a migration case.
    // It's just a fresh client that should upload its ops normally.
    const hasSyncedOps = await this.opLogStore.hasSyncedOps();
    if (!hasSyncedOps) {
      OpLog.normal(
        'OperationLogSyncService: Empty server detected, but no previously synced ops. ' +
          'This is a fresh client, not a server migration. Proceeding with normal upload.',
      );
      return;
    }

    // Server is empty AND we have PREVIOUSLY SYNCED ops AND lastServerSeq is 0
    // This is a server migration - create SYNC_IMPORT with full state
    OpLog.warn(
      'OperationLogSyncService: Server migration detected during upload check. ' +
        'Empty server with previously synced ops. Creating full state SYNC_IMPORT.',
    );
    await this._handleServerMigration();
  }

  /**
   * Handles server migration scenario by creating a SYNC_IMPORT operation
   * with the full current state.
   *
   * This is called when:
   * 1. Client has existing data (lastServerSeq > 0 from old server)
   * 2. Server returns gapDetected: true (client seq ahead of server)
   * 3. Server is empty (no ops to download)
   *
   * This indicates the client has connected to a new/reset server.
   * Without uploading full state, incremental ops would reference
   * entities that don't exist on the new server.
   */
  private async _handleServerMigration(): Promise<void> {
    OpLog.warn(
      'OperationLogSyncService: Server migration detected. Creating full state SYNC_IMPORT.',
    );

    // Get current full state from NgRx store
    let currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

    // Skip if local state is effectively empty
    if (this._isEmptyState(currentState)) {
      OpLog.warn('OperationLogSyncService: Skipping SYNC_IMPORT - local state is empty.');
      return;
    }

    // Validate and repair state before creating SYNC_IMPORT
    // This prevents corrupted state (e.g., orphaned menuTree references) from
    // propagating to other clients via the full state import.
    const validationResult = this.validateStateService.validateAndRepair(
      currentState as AppDataCompleteNew,
    );

    // If state is invalid and couldn't be repaired, abort - don't propagate corruption
    if (!validationResult.isValid) {
      OpLog.err(
        'OperationLogSyncService: Cannot create SYNC_IMPORT - state validation failed.',
        validationResult.error || validationResult.crossModelError,
      );
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.SERVER_MIGRATION_VALIDATION_FAILED,
      });
      return;
    }

    // If state was repaired, use the repaired version
    if (validationResult.repairedState) {
      OpLog.warn(
        'OperationLogSyncService: State repaired before creating SYNC_IMPORT',
        validationResult.repairSummary,
      );
      currentState = validationResult.repairedState;

      // Also update NgRx store with repaired state so local client is consistent
      this.store.dispatch(
        loadAllData({ appDataComplete: validationResult.repairedState }),
      );
    }

    // Get client ID and vector clock
    const clientId = await this._getPfapiService().pf.metaModel.loadClientId();
    if (!clientId) {
      OpLog.err(
        'OperationLogSyncService: Cannot create SYNC_IMPORT - no client ID available.',
      );
      return;
    }

    const currentClock = await this.vectorClockService.getCurrentVectorClock();
    const newClock = incrementVectorClock(currentClock, clientId);

    // Create SYNC_IMPORT operation with full state
    // NOTE: Use raw state directly (not wrapped in appDataComplete).
    // The snapshot endpoint expects raw state, and the hydrator handles
    // both formats on extraction.
    const op: Operation = {
      id: uuidv7(),
      actionType: '[SP_ALL] Load(import) all data',
      opType: OpType.SyncImport,
      entityType: 'ALL',
      payload: currentState,
      clientId,
      vectorClock: newClock,
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Append to operation log - will be uploaded via snapshot endpoint
    await this.opLogStore.append(op, 'local');

    OpLog.normal(
      'OperationLogSyncService: Created SYNC_IMPORT operation for server migration. ' +
        'Will be uploaded immediately via follow-up upload.',
    );
  }

  /**
   * Checks if the state is effectively empty (no meaningful data to sync).
   * An empty state has no tasks, projects, or tags.
   */
  private _isEmptyState(state: unknown): boolean {
    if (!state || typeof state !== 'object') {
      return true;
    }

    const s = state as Record<string, unknown>;

    // Check for meaningful data in key entity collections
    const taskState = s['task'] as { ids?: unknown[] } | undefined;
    const projectState = s['project'] as { ids?: unknown[] } | undefined;
    const tagState = s['tag'] as { ids?: (string | unknown)[] } | undefined;

    const hasNoTasks = !taskState?.ids || taskState.ids.length === 0;
    const hasNoProjects = !projectState?.ids || projectState.ids.length === 0;
    const hasNoUserTags = this._hasNoUserCreatedTags(tagState?.ids);

    // Consider empty if there are no tasks, projects, or user-defined tags
    return hasNoTasks && hasNoProjects && hasNoUserTags;
  }

  /**
   * Checks if there are no user-created tags.
   * System tags (TODAY, URGENT, IMPORTANT, IN_PROGRESS) are excluded from the count.
   */
  private _hasNoUserCreatedTags(tagIds: (string | unknown)[] | undefined): boolean {
    if (!tagIds || tagIds.length === 0) {
      return true;
    }
    const userTagCount = tagIds.filter(
      (id) => typeof id === 'string' && !SYSTEM_TAG_IDS.has(id),
    ).length;
    return userTagCount === 0;
  }

  /**
   * Checks if the primary target entities of an operation exist in the current store.
   *
   * For UPDATE/DELETE operations, the target entities (entityId/entityIds) must exist
   * in the store for the operation to be applied successfully. This method checks
   * existence using the DependencyResolverService.
   *
   * ## Why This Is Needed
   *
   * Operations don't carry their own state - they're like Redux actions that describe
   * "what happened" but rely on the current store state to apply correctly.
   *
   * After a SYNC_IMPORT replaces the entire state, some local operations may reference
   * entities that no longer exist. For example:
   * - Local client has task T1 (created long ago, CREATE op compacted)
   * - Local client does `planTasksForToday({ taskIds: [T1] })` → operation O2
   * - SYNC_IMPORT from remote client arrives (doesn't include T1)
   * - SYNC_IMPORT replaces state → T1 is gone
   * - Replay tries to apply O2 → fails because T1 doesn't exist
   *
   * @param op - The operation to check
   * @returns Array of missing entity IDs (empty if all exist or check not applicable)
   */
  private async _checkOperationEntitiesExist(op: Operation): Promise<string[]> {
    // Get entity IDs directly from the operation metadata.
    // Operations have: entityId (single entity) and entityIds (bulk operations)
    const entityIds: string[] = op.entityIds?.length
      ? op.entityIds
      : op.entityId && op.entityId !== '*'
        ? [op.entityId]
        : [];

    if (entityIds.length === 0) {
      return []; // No specific entities to check (e.g., global config)
    }

    // Skip check for CREATE operations - entities won't exist yet by definition
    if (op.opType === OpType.Create) {
      return [];
    }

    // Convert entity IDs to dependency format for the resolver
    const deps: OperationDependency[] = entityIds.map((id) => ({
      entityType: op.entityType,
      entityId: id,
      mustExist: true,
      relation: 'reference' as const,
    }));

    // Check all dependencies in a single batch (efficient for bulk operations)
    const { missing } = await this.dependencyResolver.checkDependencies(deps);
    return missing.map((d) => d.entityId);
  }

  /**
   * Re-applies local synced operations after a SYNC_IMPORT is applied.
   *
   * This handles the "late joiner" scenario where:
   * 1. Client B creates local tasks (B1, B2, B3)
   * 2. Client B uploads them to server (server accepts)
   * 3. Client B receives piggybacked SYNC_IMPORT from Client A
   * 4. SYNC_IMPORT replaces entire state (B's tasks disappear!)
   * 5. This method re-applies B's synced ops to restore them
   *
   * The key insight: piggybacked ops exclude the client's own ops,
   * so the SYNC_IMPORT doesn't include Client B's changes.
   * But those ops ARE on the server and SHOULD be in the final state.
   *
   * ## Entity Existence Check
   *
   * Before replaying, we verify that the operation's target entities still exist.
   * SYNC_IMPORT may have deleted entities that local operations reference.
   * Operations referencing deleted entities are skipped to prevent dangling references.
   *
   * @param appliedOps - The ops that were just applied (includes the SYNC_IMPORT)
   */
  private async _replayLocalSyncedOpsAfterImport(appliedOps: Operation[]): Promise<void> {
    // Get the SYNC_IMPORT's vector clock - we need to replay ops that happened AFTER it
    const syncImportOp = appliedOps.find(
      (op) => op.opType === OpType.SyncImport || op.opType === OpType.BackupImport,
    );
    if (!syncImportOp) {
      return; // Shouldn't happen, but be safe
    }

    // Get the current client ID
    const clientId = await this._getPfapiService().pf.metaModel.loadClientId();
    if (!clientId) {
      return;
    }

    // Get all local ops that:
    // 1. Were created by THIS client (so they're not in the piggybacked ops)
    // 2. Are already synced (accepted by server)
    // 3. Were created AFTER the SYNC_IMPORT (by UUIDv7 timestamp comparison)
    const allEntries = await this.opLogStore.getOpsAfterSeq(0);
    const localSyncedOps = allEntries
      .filter((entry) => {
        // Must be created by this client
        if (entry.op.clientId !== clientId) return false;
        // Must be synced (accepted by server)
        if (!entry.syncedAt) return false;
        // Must NOT be a full-state op itself
        if (
          entry.op.opType === OpType.SyncImport ||
          entry.op.opType === OpType.BackupImport
        ) {
          return false;
        }
        // Must be created AFTER the SYNC_IMPORT/BACKUP_IMPORT.
        // UUIDv7 is time-ordered: first 48 bits = millisecond timestamp.
        // Ops created BEFORE the import should NOT be replayed - they reference
        // the old state that was replaced by the import.
        // NOTE: We use UUIDv7 comparison instead of vector clock comparison
        // because imports with isForceConflict=true create a fresh vector clock
        // with a new client ID, breaking vector clock causality detection.
        if (entry.op.id < syncImportOp.id) {
          OpLog.verbose(
            `OperationLogSyncService: Skipping op ${entry.op.id} - created before SYNC_IMPORT`,
          );
          return false;
        }
        return true;
      })
      .map((entry) => entry.op);

    if (localSyncedOps.length === 0) {
      OpLog.normal(
        'OperationLogSyncService: No local synced ops to replay after SYNC_IMPORT.',
      );
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Filter out operations whose target entities were deleted by SYNC_IMPORT
    // ─────────────────────────────────────────────────────────────────────────
    // SYNC_IMPORT replaces the entire state. Local operations may reference
    // entities that existed before but are now gone. We must skip these to
    // prevent creating dangling references (e.g., Today tag → non-existent task).
    const validOps: Operation[] = [];
    const skippedOps: { op: Operation; missingIds: string[] }[] = [];

    for (const op of localSyncedOps) {
      const missingEntityIds = await this._checkOperationEntitiesExist(op);

      if (missingEntityIds.length > 0) {
        OpLog.warn(
          `OperationLogSyncService: Skipping op ${op.id} (${op.actionType}) - ` +
            `target entities deleted by SYNC_IMPORT: ${missingEntityIds.join(', ')}`,
        );
        skippedOps.push({ op, missingIds: missingEntityIds });
      } else {
        validOps.push(op);
      }
    }

    if (validOps.length === 0) {
      OpLog.normal(
        `OperationLogSyncService: All ${localSyncedOps.length} local ops skipped - ` +
          `target entities deleted by SYNC_IMPORT.`,
      );
      return;
    }

    OpLog.normal(
      `OperationLogSyncService: Replaying ${validOps.length} local synced ops ` +
        `(${skippedOps.length} skipped) after SYNC_IMPORT.`,
    );

    // Sort operations by dependencies to ensure parents are created before children
    // and DELETE ops come after ops that reference the deleted entity
    const sortedOps = sortOperationsByDependency(validOps, (op) =>
      this.dependencyResolver.extractDependencies(op),
    );

    // Re-apply these ops to restore the local changes on top of the SYNC_IMPORT state
    // Use applyOperations which handles action dispatching
    await this.operationApplier.applyOperations(sortedOps);
  }

  /**
   * Process remote operations: detect conflicts and apply non-conflicting ones.
   * If applying operations fails, rolls back any stored operations to maintain consistency.
   * @returns Object indicating how many local-win ops were created during LWW resolution
   */
  async processRemoteOps(
    remoteOps: Operation[],
  ): Promise<{ localWinOpsCreated: number }> {
    return this._processRemoteOps(remoteOps);
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

    // Warn if any migrated ops depend on dropped entities
    if (droppedEntityIds.size > 0) {
      this._warnAboutDroppedDependencies(migratedOps, droppedEntityIds);
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
      await this._filterOpsInvalidatedBySyncImport(migratedOps);

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

      // IMPORTANT: After applying a SYNC_IMPORT, re-apply any local ops that were
      // already synced to the server. This handles the "late joiner" scenario where:
      // 1. Client B creates local tasks (B1, B2, B3)
      // 2. Client B uploads them (server accepts)
      // 3. Client B receives piggybacked SYNC_IMPORT from Client A
      // 4. SYNC_IMPORT replaces state (B's tasks lost!)
      // 5. We need to re-apply B's synced ops to restore them
      await this._replayLocalSyncedOpsAfterImport(validOps);

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
    // 2. No NEW writes can start while we read the frontier AND detect conflicts
    // Without this, a race condition exists where a write could start after
    // reading the frontier but before conflict detection completes.
    let conflictResult!: ConflictResult;
    await this.lockService.request('sp_op_log', async () => {
      const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
      conflictResult = await this.detectConflicts(validOps, appliedFrontierByEntity);
    });
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
      const result = await this.conflictResolutionService.autoResolveConflictsLWW(
        conflicts,
        nonConflicting,
      );
      return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: No Conflicts - Apply directly and validate
    // ─────────────────────────────────────────────────────────────────────────
    if (nonConflicting.length > 0) {
      await this._applyNonConflictingOps(nonConflicting);
      await this._validateAfterSync();
    }
    return { localWinOpsCreated: 0 };
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
   * @throws Re-throws if application fails (ops marked as failed first)
   */
  private async _applyNonConflictingOps(ops: Operation[]): Promise<void> {
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
  async detectConflicts(
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

    for (const remoteOp of remoteOps) {
      const result = this._checkOpForConflicts(remoteOp, {
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
   * Context needed for conflict detection.
   */
  private _checkOpForConflicts(
    remoteOp: Operation,
    ctx: {
      localPendingOpsByEntity: Map<string, Operation[]>;
      appliedFrontierByEntity: Map<string, VectorClock>;
      snapshotVectorClock: VectorClock | undefined;
      snapshotEntityKeys: Set<string> | undefined;
      hasNoSnapshotClock: boolean;
    },
  ): { isStaleOrDuplicate: boolean; conflict: EntityConflict | null } {
    const entityIdsToCheck =
      remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);

    for (const entityId of entityIdsToCheck) {
      const entityKey = toEntityKey(remoteOp.entityType, entityId);
      const localOpsForEntity = ctx.localPendingOpsByEntity.get(entityKey) || [];

      const result = this._checkEntityForConflict(remoteOp, entityId, entityKey, {
        localOpsForEntity,
        appliedFrontier: ctx.appliedFrontierByEntity.get(entityKey),
        snapshotVectorClock: ctx.snapshotVectorClock,
        snapshotEntityKeys: ctx.snapshotEntityKeys,
        hasNoSnapshotClock: ctx.hasNoSnapshotClock,
      });

      if (result.isStaleOrDuplicate) {
        return { isStaleOrDuplicate: true, conflict: null };
      }
      if (result.conflict) {
        return { isStaleOrDuplicate: false, conflict: result.conflict };
      }
    }

    return { isStaleOrDuplicate: false, conflict: null };
  }

  /**
   * Checks a single entity for conflict with a remote operation.
   */
  private _checkEntityForConflict(
    remoteOp: Operation,
    entityId: string,
    entityKey: string,
    ctx: {
      localOpsForEntity: Operation[];
      appliedFrontier: VectorClock | undefined;
      snapshotVectorClock: VectorClock | undefined;
      snapshotEntityKeys: Set<string> | undefined;
      hasNoSnapshotClock: boolean;
    },
  ): { isStaleOrDuplicate: boolean; conflict: EntityConflict | null } {
    const localFrontier = this._buildEntityFrontier(entityKey, ctx);
    const localFrontierIsEmpty = Object.keys(localFrontier).length === 0;

    // FAST PATH: No local state means remote is newer by default
    if (ctx.localOpsForEntity.length === 0 && localFrontierIsEmpty) {
      return { isStaleOrDuplicate: false, conflict: null };
    }

    let vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

    // Handle potential per-entity clock corruption
    vcComparison = this._adjustForClockCorruption(vcComparison, entityKey, {
      localOpsForEntity: ctx.localOpsForEntity,
      hasNoSnapshotClock: ctx.hasNoSnapshotClock,
      localFrontierIsEmpty,
    });

    // Skip stale operations (local already has newer state)
    if (vcComparison === VectorClockComparison.GREATER_THAN) {
      OpLog.verbose(
        `OperationLogSyncService: Skipping stale remote op (local dominates): ${remoteOp.id}`,
      );
      return { isStaleOrDuplicate: true, conflict: null };
    }

    // Skip duplicate operations (already applied)
    if (vcComparison === VectorClockComparison.EQUAL) {
      OpLog.verbose(
        `OperationLogSyncService: Skipping duplicate remote op: ${remoteOp.id}`,
      );
      return { isStaleOrDuplicate: true, conflict: null };
    }

    // No pending ops = no conflict possible
    if (ctx.localOpsForEntity.length === 0) {
      return { isStaleOrDuplicate: false, conflict: null };
    }

    // CONCURRENT = true conflict
    if (vcComparison === VectorClockComparison.CONCURRENT) {
      return {
        isStaleOrDuplicate: false,
        conflict: {
          entityType: remoteOp.entityType,
          entityId,
          localOps: ctx.localOpsForEntity,
          remoteOps: [remoteOp],
          suggestedResolution: this._suggestResolution(ctx.localOpsForEntity, [remoteOp]),
        },
      };
    }

    return { isStaleOrDuplicate: false, conflict: null };
  }

  /**
   * Builds the local frontier vector clock for an entity.
   * Merges applied frontier + pending ops clocks.
   */
  private _buildEntityFrontier(
    entityKey: string,
    ctx: {
      localOpsForEntity: Operation[];
      appliedFrontier: VectorClock | undefined;
      snapshotVectorClock: VectorClock | undefined;
      snapshotEntityKeys: Set<string> | undefined;
    },
  ): VectorClock {
    // Use snapshot clock only for entities that existed at snapshot time
    const entityExistedAtSnapshot =
      ctx.snapshotEntityKeys === undefined || ctx.snapshotEntityKeys.has(entityKey);
    const fallbackClock = entityExistedAtSnapshot ? ctx.snapshotVectorClock : {};
    const baselineClock = ctx.appliedFrontier || fallbackClock || {};

    const allClocks = [
      baselineClock,
      ...ctx.localOpsForEntity.map((op) => op.vectorClock),
    ];
    return allClocks.reduce((acc, clock) => mergeVectorClocks(acc, clock), {});
  }

  /**
   * Adjusts comparison result for potential per-entity clock corruption.
   * Converts LESS_THAN to CONCURRENT if corruption is suspected.
   *
   * ## Known Limitation
   * This only handles LESS_THAN corruption (where local ops would be incorrectly
   * skipped). GREATER_THAN corruption (where remote ops would be skipped) is NOT
   * handled because:
   * 1. It's extremely rare (requires specific corruption pattern)
   * 2. Local pending ops will eventually sync on next sync cycle
   * 3. Adding complexity for this edge case isn't worth the risk of introducing bugs
   *
   * If you encounter data loss from GREATER_THAN corruption, a full re-sync
   * (clear local data and download from server) will restore consistency.
   */
  private _adjustForClockCorruption(
    comparison: VectorClockComparison,
    entityKey: string,
    ctx: {
      localOpsForEntity: Operation[];
      hasNoSnapshotClock: boolean;
      localFrontierIsEmpty: boolean;
    },
  ): VectorClockComparison {
    const entityHasPendingOps = ctx.localOpsForEntity.length > 0;
    const potentialCorruption =
      entityHasPendingOps && ctx.hasNoSnapshotClock && ctx.localFrontierIsEmpty;

    if (potentialCorruption && comparison === VectorClockComparison.LESS_THAN) {
      OpLog.warn(
        `OperationLogSyncService: Converting LESS_THAN to CONCURRENT for entity ${entityKey} due to potential clock corruption`,
      );
      return VectorClockComparison.CONCURRENT;
    }
    return comparison;
  }

  /**
   * CHECKPOINT D: Validates state after applying remote operations.
   * If validation fails, attempts repair and creates a REPAIR operation.
   */
  private async _validateAfterSync(): Promise<void> {
    await this.validateStateService.validateAndRepairCurrentState('sync');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION HEURISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Suggests a conflict resolution based on heuristics.
   *
   * ## Heuristics (in priority order)
   * 1. **Large time gap (>1 hour)**: Newer wins - user likely made sequential changes
   * 2. **Delete vs Update**: Update wins - preserve data over deletion
   * 3. **Create vs other**: Create wins - entity creation is more significant
   * 4. **Default**: Manual - let user decide
   *
   * @returns 'local' | 'remote' | 'manual' suggestion for the conflict dialog
   */
  private _suggestResolution(
    localOps: Operation[],
    remoteOps: Operation[],
  ): 'local' | 'remote' | 'manual' {
    // Edge case: no ops on one side = clear winner
    if (localOps.length === 0) return 'remote';
    if (remoteOps.length === 0) return 'local';

    const latestLocal = Math.max(...localOps.map((op) => op.timestamp));
    const latestRemote = Math.max(...remoteOps.map((op) => op.timestamp));
    const timeDiffMs = Math.abs(latestLocal - latestRemote);

    // Heuristic 1: Large time gap (>1 hour) = newer wins
    // Rationale: User likely made changes in sequence, not concurrently
    const ONE_HOUR_MS = 60 * 60 * 1000;
    if (timeDiffMs > ONE_HOUR_MS) {
      return latestLocal > latestRemote ? 'local' : 'remote';
    }

    // Heuristic 2: Delete conflicts
    const hasLocalDelete = localOps.some((op) => op.opType === OpType.Delete);
    const hasRemoteDelete = remoteOps.some((op) => op.opType === OpType.Delete);

    // Heuristic 2a: Both delete - auto-resolve (outcome is identical either way)
    // Rationale: Both clients want the entity deleted, no conflict to resolve
    if (hasLocalDelete && hasRemoteDelete) return 'local';

    // Heuristic 2b: Delete vs Update - prefer Update (preserve data)
    // Rationale: Users generally prefer not to lose work
    if (hasLocalDelete && !hasRemoteDelete) return 'remote';
    if (hasRemoteDelete && !hasLocalDelete) return 'local';

    // Heuristic 3: Create vs anything else - Create wins
    // Rationale: If one side created entity, that's more significant
    const hasLocalCreate = localOps.some((op) => op.opType === OpType.Create);
    const hasRemoteCreate = remoteOps.some((op) => op.opType === OpType.Create);
    if (hasLocalCreate && !hasRemoteCreate) return 'local';
    if (hasRemoteCreate && !hasLocalCreate) return 'remote';

    // Default: manual - let user decide
    return 'manual';
  }

  /**
   * Warns if any operations have dependencies on entities that were dropped during migration.
   * This helps identify potential issues where subsequent ops may fail due to missing dependencies.
   */
  private _warnAboutDroppedDependencies(
    ops: Operation[],
    droppedEntityIds: Set<string>,
  ): void {
    const affectedOps: Array<{ opId: string; droppedDependency: string }> = [];

    for (const op of ops) {
      const deps = this.dependencyResolver.extractDependencies(op);
      for (const dep of deps) {
        if (droppedEntityIds.has(dep.entityId)) {
          affectedOps.push({
            opId: op.id,
            droppedDependency: `${dep.entityType}:${dep.entityId}`,
          });
        }
      }
    }

    if (affectedOps.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: ${affectedOps.length} ops depend on ${droppedEntityIds.size} dropped entities. ` +
          `These ops may fail to apply due to missing dependencies.`,
        { affectedOps: affectedOps.slice(0, 10) }, // Log first 10 for debugging
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC_IMPORT FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Filters out operations invalidated by a SYNC_IMPORT, BACKUP_IMPORT, or REPAIR.
   *
   * ## The Problem
   * ```
   * Timeline:
   *   Client A creates ops → Client B does SYNC_IMPORT → Client A syncs
   *
   * Result:
   *   - Client A's ops have higher serverSeq than SYNC_IMPORT
   *   - But they reference entities that were WIPED by the import
   *   - Applying them causes "Task not found" errors
   * ```
   *
   * ## The Solution
   * Use VECTOR CLOCK comparison to determine if ops were created with knowledge
   * of the import. This is more reliable than UUIDv7 timestamps because vector
   * clocks track CAUSALITY (did the client know about the import?) rather than
   * wall-clock time (which can be affected by clock drift).
   *
   * ## Vector Clock Comparison Results
   * | Comparison     | Meaning                              | Action  |
   * |----------------|--------------------------------------|---------|
   * | GREATER_THAN   | Op created after seeing import       | ✅ Keep |
   * | EQUAL          | Same causal history as import        | ✅ Keep |
   * | LESS_THAN      | Op dominated by import               | ❌ Filter|
   * | CONCURRENT     | Op created without knowledge of import| ❌ Filter|
   *
   * Note: CONCURRENT ops are filtered because they reference pre-import state,
   * even if they were created "after" the import in wall-clock time.
   *
   * The import can be in the current batch OR in the local store from a
   * previous sync cycle. We check both to handle the case where old ops from
   * another client arrive after we already downloaded the import.
   *
   * @param ops - Operations to filter (already migrated)
   * @returns Object with `validOps` and `invalidatedOps` arrays
   */
  async _filterOpsInvalidatedBySyncImport(ops: Operation[]): Promise<{
    validOps: Operation[];
    invalidatedOps: Operation[];
  }> {
    // Find full state import operations (SYNC_IMPORT, BACKUP_IMPORT, or REPAIR) in current batch
    const fullStateImportsInBatch = ops.filter(
      (op) =>
        op.opType === OpType.SyncImport ||
        op.opType === OpType.BackupImport ||
        op.opType === OpType.Repair,
    );

    // Check local store for previously downloaded import
    const storedImport = await this.opLogStore.getLatestFullStateOp();

    // Determine the latest import (from batch or store)
    let latestImport: Operation | undefined;

    if (fullStateImportsInBatch.length > 0) {
      // Find the latest in the current batch
      const latestInBatch = fullStateImportsInBatch.reduce((latest, op) =>
        op.id > latest.id ? op : latest,
      );
      // Compare with stored import (if any)
      if (storedImport && storedImport.id > latestInBatch.id) {
        latestImport = storedImport;
      } else {
        latestImport = latestInBatch;
      }
    } else if (storedImport) {
      // No import in batch, but we have one from a previous sync
      latestImport = storedImport;
    }

    // No imports found anywhere = no filtering needed
    if (!latestImport) {
      return { validOps: ops, invalidatedOps: [] };
    }

    OpLog.normal(
      `OperationLogSyncService: Filtering ops against SYNC_IMPORT from client ${latestImport.clientId} (op: ${latestImport.id})`,
    );

    const validOps: Operation[] = [];
    const invalidatedOps: Operation[] = [];

    for (const op of ops) {
      // Full state import operations themselves are always valid
      if (
        op.opType === OpType.SyncImport ||
        op.opType === OpType.BackupImport ||
        op.opType === OpType.Repair
      ) {
        validOps.push(op);
        continue;
      }

      // Use VECTOR CLOCK comparison instead of UUIDv7 timestamps.
      // Vector clocks track CAUSALITY ("did this client know about the import?")
      // rather than wall-clock time, making them immune to client clock drift.
      //
      // Comparison results:
      // - GREATER_THAN: Op was created by a client that SAW the import → KEEP
      // - EQUAL: Same causal history as import → KEEP
      // - LESS_THAN: Op is dominated by import (created before with less history) → FILTER
      // - CONCURRENT: Op created WITHOUT knowledge of import → FILTER
      //
      // NOTE: CONCURRENT ops are filtered because they reference pre-import state,
      // even though they may have been created "after" the import in wall-clock time.
      const comparison = compareVectorClocks(op.vectorClock, latestImport.vectorClock);

      if (
        comparison === VectorClockComparison.GREATER_THAN ||
        comparison === VectorClockComparison.EQUAL
      ) {
        // Op was created by a client that had knowledge of the import
        validOps.push(op);
      } else {
        // LESS_THAN or CONCURRENT: Op created without knowledge of import
        // These ops reference the pre-import state which no longer exists
        invalidatedOps.push(op);
      }
    }

    return { validOps, invalidatedOps };
  }

  /**
   * Extracts the millisecond timestamp from a UUIDv7.
   * UUIDv7 format: first 48 bits are the millisecond timestamp.
   * The UUID format is: XXXXXXXX-XXXX-7XXX-XXXX-XXXXXXXXXXXX
   * where the first 12 hex chars (48 bits) represent the timestamp.
   *
   * @throws Error if the UUID format is invalid
   */
  private _extractTimestampFromUuidv7(uuid: string): number {
    if (!uuid || typeof uuid !== 'string') {
      throw new Error(`Invalid UUID: expected string, got ${typeof uuid}`);
    }

    // UUIDv7 should be 36 chars with hyphens (8-4-4-4-12)
    if (uuid.length !== 36) {
      throw new Error(`Invalid UUID length: expected 36, got ${uuid.length}`);
    }

    // Remove hyphens and take first 12 hex chars (48 bits = timestamp)
    const hex = uuid.replace(/-/g, '').substring(0, 12);

    // Validate that we have 12 valid hex chars
    if (!/^[0-9a-f]{12}$/i.test(hex)) {
      throw new Error(`Invalid UUID format: timestamp portion not valid hex`);
    }

    return parseInt(hex, 16);
  }
}
