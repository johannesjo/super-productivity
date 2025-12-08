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
 * Manages the synchronization of the Operation Log with remote storage.
 * This service orchestrates uploading local pending operations, downloading remote operations,
 * and detecting conflicts between local and remote changes based on vector clocks.
 *
 * Delegates to specialized services:
 * - OperationLogUploadService: Handles uploading pending operations
 * - OperationLogDownloadService: Handles downloading remote operations
 * - OperationLogManifestService: Handles manifest file operations
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

    // Process any piggybacked ops from the upload response
    if (result.piggybackedOps.length > 0) {
      await this._processRemoteOps(result.piggybackedOps);
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

  /**
   * Internal implementation of remote ops processing.
   */
  private async _processRemoteOps(remoteOps: Operation[]): Promise<void> {
    // 1. Migrate operations to current schema version (Receiver-Side Migration)
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

    // 2. Filter out operations invalidated by SYNC_IMPORT
    // When a SYNC_IMPORT is received, operations from OTHER clients that were created
    // BEFORE the import (but synced AFTER it) reference a state that no longer exists.
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

    // 3. Run conflict detection on valid ops
    // A client with 0 pending ops is NOT necessarily a "fresh" client - it may have
    // already-synced ops that remote ops could conflict with. The entity frontier
    // tracks applied ops regardless of sync status.
    const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
    const { nonConflicting, conflicts } = await this.detectConflicts(
      validOps,
      appliedFrontierByEntity,
    );

    // IMPORTANT: Handle conflicts BEFORE applying any operations.
    // If we apply non-conflicting ops first, they may reference entities that are
    // part of conflicts, causing "Task not found" errors before the user can resolve.
    if (conflicts.length > 0) {
      OpLog.warn(
        `OperationLogSyncService: Detected ${conflicts.length} conflicts. Showing dialog before applying any ops.`,
        conflicts,
      );
      // Pass non-conflicting ops to conflict resolution so they can be applied
      // together with resolved conflicts after user makes their choice
      await this.conflictResolutionService.presentConflicts(conflicts, nonConflicting);
      return;
    }

    // No conflicts - safe to apply non-conflicting ops directly
    if (nonConflicting.length > 0) {
      await this._applyNonConflictingOps(nonConflicting);
      // CHECKPOINT D: Validate state after applying ops
      await this._validateAfterSync();
    }
  }

  /**
   * Apply non-conflicting operations with crash-safe tracking.
   * Stores ops as pending, applies them, then marks as applied.
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

  /**
   * Detect conflicts between remote operations and local state.
   * Uses vector clocks for causality tracking and per-entity frontiers for conflict detection.
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

        // FAST PATH: If no local PENDING ops for this entity, no conflict possible.
        // Conflicts require concurrent modifications - if local hasn't modified this entity
        // since last sync (no pending ops), any remote op can be applied safely.
        // The appliedFrontier and snapshot clock track APPLIED history, not pending changes.
        if (localOpsForEntity.length === 0) {
          continue; // No conflict possible - check next entityId
        }

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

  /**
   * Suggests a conflict resolution based on heuristics.
   * Returns 'local' | 'remote' | 'manual' (merge not auto-supported yet)
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

  /**
   * Filters out operations that were invalidated by a SYNC_IMPORT operation.
   *
   * Problem: When Client A creates operations, then Client B does a SYNC_IMPORT, then
   * Client A syncs its operations:
   * - Client A's ops have a higher serverSeq than the SYNC_IMPORT
   * - But they reference entities that were wiped by the SYNC_IMPORT
   * - Applying them causes "Task not found" and state inconsistencies
   *
   * Solution: Discard operations from OTHER clients that were created BEFORE the
   * SYNC_IMPORT (by UUIDv7 timestamp comparison). UUIDv7 is time-ordered, so
   * lexicographic comparison gives chronological ordering.
   *
   * Also handles BACKUP_IMPORT similarly since it also replaces the entire state.
   *
   * @param ops - Operations to filter (already migrated)
   * @returns Object with validOps and invalidatedOps arrays
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
