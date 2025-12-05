import { inject, Injectable, Injector } from '@angular/core';
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
import { RepairOperationService } from '../processing/repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { AppDataCompleteNew } from '../../../../pfapi/pfapi-config';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
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
  private repairOperationService = inject(RepairOperationService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private uploadService = inject(OperationLogUploadService);
  private downloadService = inject(OperationLogDownloadService);
  private vectorClockService = inject(VectorClockService);
  private injector = inject(Injector);
  private schemaMigrationService = inject(SchemaMigrationService);
  private snackService = inject(SnackService);
  private dependencyResolver = inject(DependencyResolverService);
  private dialog = inject(MatDialog);

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

    // Always run conflict detection, even with 0 pending ops.
    // A client with 0 pending ops is NOT necessarily a "fresh" client - it may have
    // already-synced ops that remote ops could conflict with. The entity frontier
    // tracks applied ops regardless of sync status.
    const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
    const { nonConflicting, conflicts } = await this.detectConflicts(
      migratedOps,
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

    // SAFETY CHECK: Detect potential clock corruption
    // If we have pending local ops (not a fresh client) but no snapshot clock,
    // this indicates corrupted metadata - treat cautiously to avoid data loss
    const hasLocalPendingOps = localPendingOpsByEntity.size > 0;
    const hasNoSnapshotClock =
      !snapshotVectorClock || Object.keys(snapshotVectorClock).length === 0;
    const potentialClockCorruption = hasLocalPendingOps && hasNoSnapshotClock;

    if (potentialClockCorruption) {
      OpLog.warn(
        'OperationLogSyncService: Potential clock corruption detected - have pending ops but no snapshot clock. Will be conservative in conflict detection.',
        { pendingEntityCount: localPendingOpsByEntity.size },
      );
    }

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

        let vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

        // SAFETY: If we detected potential clock corruption and the local frontier
        // is empty for this entity (would result in LESS_THAN), treat as CONCURRENT
        // to force conflict resolution instead of silently accepting remote data
        const localFrontierIsEmpty = Object.keys(localFrontier).length === 0;
        if (
          potentialClockCorruption &&
          localFrontierIsEmpty &&
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
    OpLog.normal('[OperationLogSyncService] Running post-sync validation...');

    // Get current state from NgRx
    const currentState =
      (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

    // Validate and repair if needed
    const result = this.validateStateService.validateAndRepair(currentState);

    if (result.isValid && !result.wasRepaired) {
      OpLog.normal('[OperationLogSyncService] State valid after sync');
      return;
    }

    if (!result.isValid) {
      OpLog.err(
        '[OperationLogSyncService] State invalid after sync (repair failed or impossible):',
        result.error || result.crossModelError,
      );
      return;
    }

    if (!result.repairedState || !result.repairSummary) {
      OpLog.err('[OperationLogSyncService] Repair failed after sync:', result.error);
      return;
    }

    // Create REPAIR operation
    const pfapiService = this.injector.get(PfapiService);
    const clientId = await pfapiService.pf.metaModel.loadClientId();
    await this.repairOperationService.createRepairOperation(
      result.repairedState,
      result.repairSummary,
      clientId,
    );

    // Dispatch repaired state to NgRx
    this.store.dispatch(
      loadAllData({ appDataComplete: result.repairedState as AppDataCompleteNew }),
    );

    OpLog.log('[OperationLogSyncService] Created REPAIR operation after sync');
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
}
