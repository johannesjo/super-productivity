import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import {
  ConflictResult,
  EntityConflict,
  Operation,
  OpType,
  VectorClock,
} from '../operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../../pfapi/api/util/vector-clock';
import { OpLog } from '../../../log';
import { SyncProviderServiceInterface } from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { OperationApplierService } from '../processing/operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from '../processing/validate-state.service';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { VectorClockService } from './vector-clock.service';
import { toEntityKey } from '../entity-key.util';
import {
  MAX_VERSION_SKIP,
  SchemaMigrationService,
} from '../store/schema-migration.service';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { DependencyResolverService } from './dependency-resolver.service';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { UserInputWaitStateService } from '../../../../imex/sync/user-input-wait-state.service';

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
 * │  5. Conflicts? → Present dialog, piggyback non-conflicting ops         │
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
  private dialog = inject(MatDialog);
  private userInputWaitState = inject(UserInputWaitStateService);

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
   */
  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    // SAFETY: Block upload from wholly fresh clients
    // A fresh client has nothing meaningful to upload and uploading could overwrite
    // valid remote data with empty/default state.
    const isFresh = await this.isWhollyFreshClient();
    if (isFresh) {
      OpLog.warn(
        'OperationLogSyncService: Upload blocked - this is a fresh client with no history. ' +
          'Download remote data first before uploading.',
      );
      return;
    }

    const result = await this.uploadService.uploadPendingOps(syncProvider);

    // STEP 1: Process piggybacked ops FIRST
    // This is critical: piggybacked ops may contain the "winning" remote versions
    // that caused our local ops to be rejected. By processing them first while our
    // local ops are still in the pending list, conflict detection will work properly
    // and the user will see a conflict dialog to choose which version to keep.
    if (result.piggybackedOps.length > 0) {
      await this._processRemoteOps(result.piggybackedOps);
    }

    // STEP 2: Now handle server-rejected operations
    // At this point, conflicts have been detected and presented to the user.
    // We mark remaining rejected ops (those not already resolved via conflict dialog)
    // as rejected so they won't be re-uploaded.
    await this._handleRejectedOps(result.rejectedOps);
  }

  /**
   * Handles operations that were rejected by the server.
   *
   * This is called AFTER processing piggybacked ops to ensure that:
   * 1. Conflicts are detected properly (local ops still in pending list)
   * 2. User has had a chance to resolve conflicts via the dialog
   * 3. Only ops that weren't resolved via conflict dialog get marked rejected
   *
   * @param rejectedOps - Operations rejected by the server with error messages
   */
  private async _handleRejectedOps(
    rejectedOps: Array<{ opId: string; error?: string }>,
  ): Promise<void> {
    if (rejectedOps.length === 0) {
      return;
    }

    // Check which rejected ops are still pending (not yet handled by conflict resolution)
    const stillPendingRejected: string[] = [];
    for (const rejected of rejectedOps) {
      const entry = await this.opLogStore.getOpById(rejected.opId);
      // Only mark as rejected if:
      // - Op still exists (wasn't somehow removed)
      // - Op is not yet synced (if synced, it was accepted after all)
      // - Op is not already rejected (conflict resolution may have already handled it)
      if (entry && !entry.syncedAt && !entry.rejectedAt) {
        stillPendingRejected.push(rejected.opId);
        OpLog.normal(
          `OperationLogSyncService: Marking op ${rejected.opId} as rejected (not resolved via conflict): ${rejected.error || 'unknown error'}`,
        );
      }
    }

    if (stillPendingRejected.length > 0) {
      await this.opLogStore.markRejected(stillPendingRejected);
      OpLog.normal(
        `OperationLogSyncService: Marked ${stillPendingRejected.length} server-rejected ops as rejected`,
      );

      // Notify user if significant number of ops were rejected without conflict resolution
      const MAX_REJECTED_OPS_BEFORE_WARNING = 10;
      if (stillPendingRejected.length >= MAX_REJECTED_OPS_BEFORE_WARNING) {
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.UPLOAD_OPS_REJECTED,
          translateParams: { count: stillPendingRejected.length },
        });
      }
    }
  }

  /**
   * Download and process remote operations from storage.
   * For fresh clients (no local history), shows a confirmation dialog before accepting remote data
   * to prevent accidental data overwrites.
   */
  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    const result = await this.downloadService.downloadRemoteOps(syncProvider);

    if (result.newOps.length === 0) {
      OpLog.normal(
        'OperationLogSyncService: No new remote operations to process after download.',
      );
      return;
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

      const confirmed = await this._showFreshClientSyncConfirmation(result.newOps.length);
      if (!confirmed) {
        OpLog.normal(
          'OperationLogSyncService: User cancelled fresh client sync. Remote data not applied.',
        );
        this.snackService.open({
          msg: T.F.SYNC.S.FRESH_CLIENT_SYNC_CANCELLED,
        });
        return;
      }

      OpLog.normal(
        'OperationLogSyncService: User confirmed fresh client sync. Proceeding with remote data.',
      );
    }

    await this._processRemoteOps(result.newOps);
  }

  /**
   * Shows a confirmation dialog for fresh client sync.
   * Asks user to confirm before accepting remote data on a fresh install.
   */
  private async _showFreshClientSyncConfirmation(opCount: number): Promise<boolean> {
    // Signal that we're waiting for user input to prevent sync timeout
    const stopWaiting = this.userInputWaitState.startWaiting('fresh-client-confirm');
    try {
      const dialogRef = this.dialog.open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          title: T.F.SYNC.D_FRESH_CLIENT_CONFIRM.TITLE,
          message: T.F.SYNC.D_FRESH_CLIENT_CONFIRM.MESSAGE,
          translateParams: { count: opCount },
          okTxt: T.F.SYNC.D_FRESH_CLIENT_CONFIRM.OK,
          cancelTxt: T.G.CANCEL,
        },
      });

      const result = await firstValueFrom(dialogRef.afterClosed());
      return result === true;
    } finally {
      stopWaiting();
    }
  }

  /**
   * Process remote operations: detect conflicts and apply non-conflicting ones.
   * If applying operations fails, rolls back any stored operations to maintain consistency.
   */
  async processRemoteOps(remoteOps: Operation[]): Promise<void> {
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
   */
  private async _processRemoteOps(remoteOps: Operation[]): Promise<void> {
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
      return;
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
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Filter ops invalidated by SYNC_IMPORT
    // When a full-state import happens, ops from OTHER clients created BEFORE the
    // import reference entities that were wiped. These must be discarded.
    // ─────────────────────────────────────────────────────────────────────────
    const { validOps, invalidatedOps } =
      this._filterOpsInvalidatedBySyncImport(migratedOps);

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
      return;
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
      await this._validateAfterSync();
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Conflict Detection
    // Compare remote ops against local pending ops using vector clocks.
    // NOTE: A client with 0 pending ops can still have an entity frontier from
    // already-synced ops. The frontier tracks ALL applied ops, not just pending.
    // ─────────────────────────────────────────────────────────────────────────
    const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
    const { nonConflicting, conflicts } = await this.detectConflicts(
      validOps,
      appliedFrontierByEntity,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Handle Results - Apply or Present Conflicts
    // IMPORTANT: If conflicts exist, we must NOT apply non-conflicting ops first.
    // They may depend on entities in the conflict (e.g., Task depends on Project).
    // Instead, piggyback them to ConflictResolutionService for batched application.
    // ─────────────────────────────────────────────────────────────────────────
    if (conflicts.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: Detected ${conflicts.length} conflicts. Showing dialog before applying any ops.`,
        conflicts,
      );
      // Piggyback non-conflicting ops so they're applied with resolved conflicts
      await this.conflictResolutionService.presentConflicts(conflicts, nonConflicting);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: No Conflicts - Apply directly and validate
    // ─────────────────────────────────────────────────────────────────────────
    if (nonConflicting.length > 0) {
      await this._applyNonConflictingOps(nonConflicting);
      await this._validateAfterSync();
    }
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
    // Track stored seqs for marking as applied after success
    const storedSeqs: number[] = [];
    // Track ops that are NOT duplicates (need to be applied)
    const opsToApply: Operation[] = [];
    // Track op IDs for error handling
    const storedOpIds: string[] = [];

    // Store operations with pending status before applying
    // If we crash after storing but before applying, these will be retried on startup
    for (const op of ops) {
      if (!(await this.opLogStore.hasOp(op.id))) {
        const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
        storedSeqs.push(seq);
        storedOpIds.push(op.id);
        opsToApply.push(op);
      } else {
        OpLog.verbose(`OperationLogSyncService: Skipping duplicate op: ${op.id}`);
      }
    }

    // Apply only NON-duplicate ops to NgRx store
    if (opsToApply.length > 0) {
      try {
        await this.operationApplier.applyOperations(opsToApply);
      } catch (e) {
        // If application fails catastrophically, mark ops as failed to prevent
        // them from being uploaded in a potentially inconsistent state
        OpLog.err(
          `OperationLogSyncService: Failed to apply ${opsToApply.length} ops. Marking as failed.`,
          e,
        );
        await this.opLogStore.markFailed(storedOpIds);
        throw e;
      }
    }

    // Mark ops as successfully applied (crash recovery will skip these)
    if (storedSeqs.length > 0) {
      await this.opLogStore.markApplied(storedSeqs);
      OpLog.normal(
        `OperationLogSyncService: Applied and marked ${storedSeqs.length} remote ops`,
      );
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
    // This prevents false conflicts for entities that haven't been modified since compaction
    const snapshotVectorClock = await this.vectorClockService.getSnapshotVectorClock();
    const hasNoSnapshotClock =
      !snapshotVectorClock || Object.keys(snapshotVectorClock).length === 0;

    for (const remoteOp of remoteOps) {
      const entityIdsToCheck =
        remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);
      let isConflicting = false;
      let isStaleOrDuplicate = false;

      for (const entityId of entityIdsToCheck) {
        const entityKey = toEntityKey(remoteOp.entityType, entityId);
        const localOpsForEntity = localPendingOpsByEntity.get(entityKey) || [];
        const appliedFrontier = appliedFrontierByEntity.get(entityKey); // latest applied vector per entity

        // Build the frontier from everything we know locally (applied + pending)
        // Use snapshot vector clock as fallback if no per-entity frontier exists
        // This ensures entities modified before compaction aren't treated as having no history
        const baselineClock = appliedFrontier || snapshotVectorClock || {};
        const allClocks = [
          baselineClock,
          ...localOpsForEntity.map((op) => op.vectorClock),
        ];
        const localFrontier = allClocks.reduce(
          (acc, clock) => mergeVectorClocks(acc, clock),
          {},
        );

        const localFrontierIsEmpty = Object.keys(localFrontier).length === 0;

        // FAST PATH: If no local PENDING ops AND no applied frontier for this entity,
        // there's no local state to compare against - the remote op is newer by default.
        if (localOpsForEntity.length === 0 && localFrontierIsEmpty) {
          continue; // No local state - remote is newer, check next entityId
        }

        let vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

        // SAFETY: Per-entity clock corruption check.
        // If THIS entity has pending local ops but an empty frontier (no snapshot clock),
        // this indicates corrupted metadata for this specific entity.
        // Convert LESS_THAN to CONCURRENT to force conflict resolution.
        // NOTE: We check per-entity, not globally, to avoid false conflicts when
        // a fresh client has unrelated pending ops (e.g., GLOBAL_CONFIG) but no
        // local ops for the entity being checked (e.g., TASK).
        const entityHasPendingOps = localOpsForEntity.length > 0;
        const potentialEntityCorruption =
          entityHasPendingOps && hasNoSnapshotClock && localFrontierIsEmpty;
        if (
          potentialEntityCorruption &&
          vcComparison === VectorClockComparison.LESS_THAN
        ) {
          OpLog.warn(
            `OperationLogSyncService: Converting LESS_THAN to CONCURRENT for entity ${entityKey} due to potential clock corruption`,
          );
          vcComparison = VectorClockComparison.CONCURRENT;
        }

        // Skip stale operations (local already has newer state)
        if (vcComparison === VectorClockComparison.GREATER_THAN) {
          OpLog.verbose(
            `OperationLogSyncService: Skipping stale remote op (local dominates): ${remoteOp.id}`,
          );
          isStaleOrDuplicate = true;
          break;
        }

        // Skip duplicate operations (already applied)
        if (vcComparison === VectorClockComparison.EQUAL) {
          OpLog.verbose(
            `OperationLogSyncService: Skipping duplicate remote op: ${remoteOp.id}`,
          );
          isStaleOrDuplicate = true;
          break;
        }

        // If no pending local ops, there's no conflict - just check stale/duplicate above.
        // The remote op is newer (LESS_THAN) and safe to apply.
        if (localOpsForEntity.length === 0) {
          continue; // No pending ops = no conflict possible
        }

        if (vcComparison === VectorClockComparison.CONCURRENT) {
          // True conflict - same entity modified independently
          conflicts.push({
            entityType: remoteOp.entityType,
            entityId: entityId, // Conflicting entity ID
            localOps: localOpsForEntity,
            remoteOps: [remoteOp],
            suggestedResolution: this._suggestResolution(localOpsForEntity, [remoteOp]),
          });
          isConflicting = true;
          break; // Conflict for this remoteOp, move to next remoteOp
        }
      }

      if (!isConflicting && !isStaleOrDuplicate) {
        // Remote is newer (LESS_THAN) - safe to apply
        nonConflicting.push(remoteOp);
      }
    }
    return { nonConflicting, conflicts };
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

    // Heuristic 2: Delete vs Update - prefer Update (preserve data)
    // Rationale: Users generally prefer not to lose work
    const hasLocalDelete = localOps.some((op) => op.opType === OpType.Delete);
    const hasRemoteDelete = remoteOps.some((op) => op.opType === OpType.Delete);
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
   * Filters out operations invalidated by a SYNC_IMPORT or BACKUP_IMPORT.
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
   * Discard ops from OTHER clients created BEFORE the import (by UUIDv7 comparison).
   * UUIDv7 is time-ordered, so lexicographic comparison gives chronological ordering.
   *
   * ## Which ops are kept?
   * | Op Source              | Op Created          | Result      |
   * |------------------------|---------------------|-------------|
   * | Same client as import  | Any time            | ✅ Valid    |
   * | Other client           | AFTER import        | ✅ Valid    |
   * | Other client           | BEFORE import       | ❌ Invalid  |
   *
   * @param ops - Operations to filter (already migrated)
   * @returns Object with `validOps` and `invalidatedOps` arrays
   */
  _filterOpsInvalidatedBySyncImport(ops: Operation[]): {
    validOps: Operation[];
    invalidatedOps: Operation[];
  } {
    // Find full state import operations (SYNC_IMPORT or BACKUP_IMPORT)
    const fullStateImports = ops.filter(
      (op) => op.opType === OpType.SyncImport || op.opType === OpType.BackupImport,
    );

    // No imports = no filtering needed
    if (fullStateImports.length === 0) {
      return { validOps: ops, invalidatedOps: [] };
    }

    // Find the latest import by UUIDv7 (lexicographic = chronological for UUIDv7)
    // If there are multiple imports, we care about the latest one since it defines
    // the current state that subsequent ops should reference.
    const latestImport = fullStateImports.reduce((latest, op) =>
      op.id > latest.id ? op : latest,
    );

    OpLog.normal(
      `OperationLogSyncService: Processing SYNC_IMPORT from client ${latestImport.clientId} (op: ${latestImport.id})`,
    );

    const validOps: Operation[] = [];
    const invalidatedOps: Operation[] = [];

    for (const op of ops) {
      // Full state import operations themselves are always valid
      if (op.opType === OpType.SyncImport || op.opType === OpType.BackupImport) {
        validOps.push(op);
        continue;
      }

      // Operations from the SAME client as the import are valid
      // They were created with knowledge of the import state
      if (op.clientId === latestImport.clientId) {
        validOps.push(op);
        continue;
      }

      // Operations created AFTER the import are valid (by UUIDv7 comparison)
      // UUIDv7 is time-ordered: first 48 bits = millisecond timestamp
      // Lexicographic comparison works for chronological ordering
      if (op.id > latestImport.id) {
        validOps.push(op);
        continue;
      }

      // Operations created BEFORE the import from OTHER clients are invalidated
      // They reference the pre-import state which no longer exists
      invalidatedOps.push(op);
    }

    return { validOps, invalidatedOps };
  }
}
