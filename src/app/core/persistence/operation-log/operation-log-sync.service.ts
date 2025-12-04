import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import {
  ConflictResult,
  EntityConflict,
  Operation,
  VectorClock,
} from './operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../pfapi/api/util/vector-clock';
import { PFLog } from '../../log';
import { SyncProviderServiceInterface } from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../pfapi/api/pfapi.const';
import { OperationApplierService } from './operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from './validate-state.service';
import { RepairOperationService } from './repair-operation.service';
import { PfapiStoreDelegateService } from '../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { OperationLogUploadService } from './operation-log-upload.service';
import { OperationLogDownloadService } from './operation-log-download.service';
import { VectorClockService } from './vector-clock.service';

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

  /**
   * Upload pending local operations to remote storage.
   * Any piggybacked operations received during upload are automatically processed.
   */
  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    const result = await this.uploadService.uploadPendingOps(syncProvider);

    // Process any piggybacked ops from the upload response
    if (result.piggybackedOps.length > 0) {
      await this._processRemoteOps(result.piggybackedOps);
    }
  }

  /**
   * Download and process remote operations from storage.
   */
  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    const result = await this.downloadService.downloadRemoteOps(syncProvider);

    if (result.newOps.length === 0) {
      PFLog.normal(
        'OperationLogSyncService: No new remote operations to process after download.',
      );
      return;
    }

    await this._processRemoteOps(result.newOps);
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
    const appliedFrontierByEntity = await this.vectorClockService.getEntityFrontier();
    const { nonConflicting, conflicts } = await this.detectConflicts(
      remoteOps,
      appliedFrontierByEntity,
    );

    // Apply non-conflicting ops with rollback on failure
    if (nonConflicting.length > 0) {
      // Track ops we've stored for potential rollback
      const storedOpIds: string[] = [];

      try {
        // Store operations in IndexedDB before applying
        for (const op of nonConflicting) {
          if (!(await this.opLogStore.hasOp(op.id))) {
            await this.opLogStore.append(op, 'remote');
            storedOpIds.push(op.id);
          }
        }

        // Apply all ops - if this fails, we need to clean up stored ops
        await this.operationApplier.applyOperations(nonConflicting);
      } catch (e) {
        // Rollback: remove ops that were stored but not successfully applied
        if (storedOpIds.length > 0) {
          PFLog.critical(
            'OperationLogSyncService: Failed to apply operations, rolling back stored ops',
            {
              storedOpIds,
              error: e,
            },
          );

          try {
            await this.opLogStore.deleteOpsWhere((entry) =>
              storedOpIds.includes(entry.op.id),
            );
            PFLog.normal(
              `OperationLogSyncService: Rolled back ${storedOpIds.length} stored ops`,
            );
          } catch (rollbackError) {
            PFLog.critical(
              'OperationLogSyncService: Failed to rollback stored ops - state may be inconsistent',
              { rollbackError, originalError: e },
            );
          }
        }

        throw e;
      }
    }

    // Handle conflicts
    if (conflicts.length > 0) {
      PFLog.warn(
        `OperationLogSyncService: Detected ${conflicts.length} conflicts.`,
        conflicts,
      );
      // Conflict resolution service will validate after resolving
      await this.conflictResolutionService.presentConflicts(conflicts);
    } else if (nonConflicting.length > 0) {
      // CHECKPOINT D: If no conflicts but we applied ops, validate state
      await this._validateAfterSync();
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

    for (const remoteOp of remoteOps) {
      const entityIdsToCheck =
        remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);
      let isConflicting = false;
      let isStaleOrDuplicate = false;

      for (const entityId of entityIdsToCheck) {
        const entityKey = `${remoteOp.entityType}:${entityId}`;
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

        const vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

        // Skip stale operations (local already has newer state)
        if (vcComparison === VectorClockComparison.GREATER_THAN) {
          PFLog.verbose(
            `OperationLogSyncService: Skipping stale remote op (local dominates): ${remoteOp.id}`,
          );
          isStaleOrDuplicate = true;
          break;
        }

        // Skip duplicate operations (already applied)
        if (vcComparison === VectorClockComparison.EQUAL) {
          PFLog.verbose(
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
            suggestedResolution: 'manual', // Default to manual for now
            // TODO: implement suggestResolution
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
    PFLog.normal('[OperationLogSyncService] Running post-sync validation...');

    // Get current state from NgRx
    const currentState =
      (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

    // Validate and repair if needed
    const result = this.validateStateService.validateAndRepair(currentState);

    if (!result.wasRepaired) {
      PFLog.normal('[OperationLogSyncService] State valid after sync');
      return;
    }

    if (!result.repairedState || !result.repairSummary) {
      PFLog.err('[OperationLogSyncService] Repair failed after sync:', result.error);
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

    PFLog.log('[OperationLogSyncService] Created REPAIR operation after sync');
  }
}
