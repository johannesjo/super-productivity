import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { LockService } from './lock.service';
import {
  ConflictResult,
  EntityConflict,
  Operation,
  OperationLogEntry,
  OperationLogManifest,
  VectorClock,
} from './operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../pfapi/api/util/vector-clock';
import { PFLog } from '../../log';
import { chunkArray } from '../../../util/chunk-array';
import { RemoteFileNotFoundAPIError } from '../../../pfapi/api/errors/errors';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../pfapi/api/pfapi.const';
import { OperationApplierService } from './operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ValidateStateService } from './validate-state.service';
import { RepairOperationService } from './repair-operation.service';
import { PfapiStoreDelegateService } from '../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';

const OPS_DIR = 'ops/';
const MANIFEST_FILE_NAME = OPS_DIR + 'manifest.json';
const MANIFEST_VERSION = 1;

/**
 * Type guard to check if a provider supports operation-based sync
 */
const isOperationSyncCapable = (
  provider: SyncProviderServiceInterface<SyncProviderId>,
): provider is SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable => {
  return (
    'supportsOperationSync' in provider &&
    (provider as unknown as OperationSyncCapable).supportsOperationSync === true
  );
};

/**
 * Manages the synchronization of the Operation Log with remote storage.
 * This service handles uploading local pending operations, downloading remote operations,
 * and detecting conflicts between local and remote changes based on vector clocks.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogSyncService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private operationApplier = inject(OperationApplierService);
  private conflictResolutionService = inject(ConflictResolutionService);
  private validateStateService = inject(ValidateStateService);
  private repairOperationService = inject(RepairOperationService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private snackService = inject(SnackService);
  private injector = inject(Injector);

  private _getManifestFileName(): string {
    return MANIFEST_FILE_NAME;
  }

  private async _loadRemoteManifest(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<OperationLogManifest> {
    try {
      const fileContent = await syncProvider.downloadFile(this._getManifestFileName());
      const manifest = JSON.parse(fileContent.dataStr) as OperationLogManifest;
      PFLog.normal('OperationLogSyncService: Loaded remote manifest', manifest);
      return manifest;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        PFLog.normal('OperationLogSyncService: Remote manifest not found. Creating new.');
        return { version: MANIFEST_VERSION, operationFiles: [] };
      }
      PFLog.error('OperationLogSyncService: Failed to load remote manifest', e);
      throw e;
    }
  }

  private async _uploadRemoteManifest(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    manifest: OperationLogManifest,
  ): Promise<void> {
    PFLog.normal('OperationLogSyncService: Uploading remote manifest', manifest);
    // Note: revToMatch is null, we always overwrite the manifest for simplicity
    await syncProvider.uploadFile(
      this._getManifestFileName(),
      JSON.stringify(manifest),
      null,
      true, // Force overwrite is important for manifest
    );
  }

  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    if (!syncProvider) {
      PFLog.warn('OperationLogSyncService: No active sync provider passed for upload.');
      return;
    }

    // Use operation sync if supported
    if (isOperationSyncCapable(syncProvider)) {
      await this._uploadPendingOpsViaApi(syncProvider);
      return;
    }

    // Fall back to file-based sync
    await this._uploadPendingOpsViaFiles(syncProvider);
  }

  private async _uploadPendingOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
  ): Promise<void> {
    PFLog.normal('OperationLogSyncService: Uploading pending operations via API...');
    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        PFLog.normal('OperationLogSyncService: No pending operations to upload.');
        return;
      }

      // Get the clientId from the first operation
      const clientId = pendingOps[0].op.clientId;
      const lastKnownServerSeq = await syncProvider.getLastServerSeq();

      // Convert to SyncOperation format
      const syncOps: SyncOperation[] = pendingOps.map((entry) => ({
        id: entry.op.id,
        clientId: entry.op.clientId,
        actionType: entry.op.actionType,
        opType: entry.op.opType,
        entityType: entry.op.entityType,
        entityId: entry.op.entityId,
        entityIds: entry.op.entityIds,
        payload: entry.op.payload,
        vectorClock: entry.op.vectorClock,
        timestamp: entry.op.timestamp,
        schemaVersion: entry.op.schemaVersion,
      }));

      // Upload in batches (API supports up to 100 ops per request)
      const MAX_OPS_PER_REQUEST = 100;
      const chunks = chunkArray(syncOps, MAX_OPS_PER_REQUEST);
      const correspondingEntries = chunkArray(pendingOps, MAX_OPS_PER_REQUEST);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const entries = correspondingEntries[i];

        PFLog.normal(
          `OperationLogSyncService: Uploading batch of ${chunk.length} ops via API`,
        );

        const response = await syncProvider.uploadOps(
          chunk,
          clientId,
          lastKnownServerSeq,
        );

        // Mark successfully accepted ops as synced
        const acceptedSeqs = response.results
          .filter((r) => r.accepted)
          .map((r) => {
            const entry = entries.find((e) => e.op.id === r.opId);
            return entry?.seq;
          })
          .filter((seq): seq is number => seq !== undefined);

        if (acceptedSeqs.length > 0) {
          await this.opLogStore.markSynced(acceptedSeqs);
        }

        // Update last known server seq
        await syncProvider.setLastServerSeq(response.latestSeq);

        // Process any piggybacked new ops from other clients
        if (response.newOps && response.newOps.length > 0) {
          PFLog.normal(
            `OperationLogSyncService: Received ${response.newOps.length} piggybacked ops`,
          );
          const piggybackedOps = response.newOps.map((serverOp) =>
            this._syncOpToOperation(serverOp.op),
          );
          await this._processRemoteOps(piggybackedOps);
        }

        // Log any rejected operations
        const rejected = response.results.filter((r) => !r.accepted);
        if (rejected.length > 0) {
          PFLog.warn(
            `OperationLogSyncService: ${rejected.length} ops were rejected`,
            rejected,
          );
        }
      }

      PFLog.normal(
        `OperationLogSyncService: Successfully uploaded ${pendingOps.length} ops via API.`,
      );
    });
  }

  private async _uploadPendingOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    PFLog.normal('OperationLogSyncService: Uploading pending operations via files...');
    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        PFLog.normal('OperationLogSyncService: No pending operations to upload.');
        return;
      }

      const remoteManifest = await this._loadRemoteManifest(syncProvider);
      const updatedManifestFiles: string[] = [...remoteManifest.operationFiles];
      let newFilesUploaded = 0;

      // Batch into chunks (e.g., 100 ops per file for WebDAV)
      const MAX_OPS_PER_FILE = 100;
      const chunks = chunkArray(pendingOps, MAX_OPS_PER_FILE);

      for (const chunk of chunks) {
        // Filename format: ops_CLIENTID_TIMESTAMP.json
        const filename = `ops_${chunk[0].op.clientId}_${chunk[0].op.timestamp}.json`;
        const fullFilePath = OPS_DIR + filename;

        // Only upload if file isn't already in the manifest (simple dedupe for now)
        if (!updatedManifestFiles.includes(fullFilePath)) {
          PFLog.normal(
            `OperationLogSyncService: Uploading ${chunk.length} ops to ${fullFilePath}`,
          );
          // revToMatch is null, as these are new files
          await syncProvider.uploadFile(fullFilePath, JSON.stringify(chunk), null);
          updatedManifestFiles.push(fullFilePath);
          newFilesUploaded++;
          // Only mark as synced after successful upload
          await this.opLogStore.markSynced(chunk.map((e) => e.seq));
        } else {
          PFLog.normal(
            `OperationLogSyncService: Skipping upload for existing file ${fullFilePath}`,
          );
          // File already exists in manifest, so these ops are already synced
          // Mark them as synced locally to prevent re-upload attempts
          await this.opLogStore.markSynced(chunk.map((e) => e.seq));
        }
      }

      if (newFilesUploaded > 0) {
        // Sort files for deterministic manifest content
        updatedManifestFiles.sort();
        remoteManifest.operationFiles = updatedManifestFiles;
        await this._uploadRemoteManifest(syncProvider, remoteManifest);
      }

      PFLog.normal(
        `OperationLogSyncService: Successfully uploaded ${newFilesUploaded} new operation files (${pendingOps.length} ops).`,
      );
    });
  }

  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    if (!syncProvider) {
      PFLog.warn('OperationLogSyncService: No active sync provider passed for download.');
      return;
    }

    // Use operation sync if supported
    if (isOperationSyncCapable(syncProvider)) {
      await this._downloadRemoteOpsViaApi(syncProvider);
      return;
    }

    // Fall back to file-based sync
    await this._downloadRemoteOpsViaFiles(syncProvider);
  }

  private async _downloadRemoteOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
  ): Promise<void> {
    PFLog.normal('OperationLogSyncService: Downloading remote operations via API...');
    await this.lockService.request('sp_op_log_download', async () => {
      // Get clientId at start to avoid race conditions with other tabs
      const pfapiService = this.injector.get(PfapiService);
      const clientId = await pfapiService.pf.metaModel.loadClientId();

      const lastServerSeq = await syncProvider.getLastServerSeq();
      const appliedOpIds = await this.opLogStore.getAppliedOpIds();

      // Download ops in pages
      let hasMore = true;
      let sinceSeq = lastServerSeq;
      let totalProcessed = 0;

      while (hasMore) {
        const response = await syncProvider.downloadOps(sinceSeq, undefined, 500);

        if (response.ops.length === 0) {
          break;
        }

        // Convert SyncOperations to Operations, filtering already applied
        const newOps = response.ops
          .filter((serverOp) => !appliedOpIds.has(serverOp.op.id))
          .map((serverOp) => this._syncOpToOperation(serverOp.op));

        if (newOps.length > 0) {
          await this._processRemoteOps(newOps);
          totalProcessed += newOps.length;
        }

        // Update cursors
        sinceSeq = response.ops[response.ops.length - 1].serverSeq;
        hasMore = response.hasMore;

        // Update the last known server seq
        await syncProvider.setLastServerSeq(response.latestSeq);
      }

      // Acknowledge that we've processed ops up to the latest seq
      if (totalProcessed > 0 && clientId) {
        await syncProvider.acknowledgeOps(clientId, sinceSeq);
      }

      PFLog.normal(
        `OperationLogSyncService: Downloaded and processed ${totalProcessed} remote operations via API.`,
      );
    });
  }

  private async _downloadRemoteOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<void> {
    PFLog.normal('OperationLogSyncService: Downloading remote operations via files...');
    await this.lockService.request('sp_op_log_download', async () => {
      const remoteManifest = await this._loadRemoteManifest(syncProvider);
      let remoteOpFileNames: string[] = remoteManifest.operationFiles;

      // Fallback if manifest is empty or listFiles is supported and more files are found
      if (remoteOpFileNames.length === 0 && syncProvider.listFiles) {
        PFLog.normal(
          'OperationLogSyncService: Manifest is empty, falling back to listFiles to discover ops.',
        );
        try {
          // listFiles returns full paths like ops/ops_CLIENTID_TIMESTAMP.json
          const discoveredFiles = await syncProvider.listFiles(OPS_DIR);
          remoteOpFileNames = discoveredFiles.filter(
            (name) => name.startsWith(OPS_DIR + 'ops_') && name.endsWith('.json'),
          );
          // If we discovered files, create/update the manifest for future syncs
          if (remoteOpFileNames.length > 0) {
            remoteManifest.operationFiles = remoteOpFileNames.sort();
            await this._uploadRemoteManifest(syncProvider, remoteManifest);
          }
        } catch (e) {
          PFLog.error(
            'OperationLogSyncService: Failed to list remote operation files during fallback',
            e,
          );
          return;
        }
      } else if (!syncProvider.listFiles) {
        PFLog.warn(
          'OperationLogSyncService: Provider does not support listFiles. Relying solely on manifest.',
        );
      }

      if (remoteOpFileNames.length === 0) {
        PFLog.normal('OperationLogSyncService: No remote operation files found.');
        return;
      }

      const appliedOpIds = await this.opLogStore.getAppliedOpIds();
      const appliedFrontierByEntity = await this.opLogStore.getEntityFrontier();

      const allRemoteOps: Operation[] = [];
      const failedFiles: string[] = [];

      for (const fullFilePath of remoteOpFileNames) {
        try {
          const fileContent = await syncProvider.downloadFile(fullFilePath);
          const chunk = JSON.parse(fileContent.dataStr) as OperationLogEntry[];
          // Filter already applied ops from this chunk before adding to allRemoteOps
          const newOpsInChunk = chunk.filter((entry) => !appliedOpIds.has(entry.op.id));
          allRemoteOps.push(...newOpsInChunk.map((entry) => entry.op));
        } catch (e) {
          PFLog.error(
            `OperationLogSyncService: Failed to download or parse remote op file ${fullFilePath}`,
            e,
          );
          failedFiles.push(fullFilePath);
        }
      }

      // Warn user about failed downloads
      if (failedFiles.length > 0) {
        PFLog.warn(
          `OperationLogSyncService: ${failedFiles.length} remote operation file(s) failed to download`,
          failedFiles,
        );
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.INCOMPLETE_OP_SYNC,
          translateParams: { count: failedFiles.length },
        });
      }

      if (allRemoteOps.length === 0) {
        PFLog.normal(
          'OperationLogSyncService: No new remote operations to download after filtering.',
        );
        return;
      }

      const { nonConflicting, conflicts } = await this.detectConflicts(
        allRemoteOps,
        appliedFrontierByEntity,
      );

      // Store non-conflicting ops in IndexedDB before applying (ensures durability)
      for (const op of nonConflicting) {
        if (!(await this.opLogStore.hasOp(op.id))) {
          await this.opLogStore.append(op, 'remote');
        }
      }

      // Apply non-conflicting ops (now with dependency sorting)
      await this.operationApplier.applyOperations(nonConflicting);

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
        // (Conflict resolution handles validation when there are conflicts)
        await this._validateAfterSync();
      }

      PFLog.normal(
        `OperationLogSyncService: Downloaded and processed remote operations via files.`,
      );
    });
  }

  /**
   * Process remote operations: detect conflicts and apply non-conflicting ones
   * If applying operations fails, rolls back any stored operations to maintain consistency.
   */
  private async _processRemoteOps(remoteOps: Operation[]): Promise<void> {
    const appliedFrontierByEntity = await this.opLogStore.getEntityFrontier();
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
   * Convert SyncOperation to Operation (handles type differences)
   */
  private _syncOpToOperation(syncOp: SyncOperation): Operation {
    return {
      id: syncOp.id,
      clientId: syncOp.clientId,
      actionType: syncOp.actionType,
      opType: syncOp.opType as Operation['opType'],
      entityType: syncOp.entityType as Operation['entityType'],
      entityId: syncOp.entityId,
      entityIds: syncOp.entityIds,
      payload: syncOp.payload,
      vectorClock: syncOp.vectorClock,
      timestamp: syncOp.timestamp,
      schemaVersion: syncOp.schemaVersion,
    };
  }

  async detectConflicts(
    remoteOps: Operation[],
    appliedFrontierByEntity: Map<string, VectorClock>,
  ): Promise<ConflictResult> {
    const localPendingOpsByEntity = await this.opLogStore.getUnsyncedByEntity();
    const conflicts: EntityConflict[] = [];
    const nonConflicting: Operation[] = [];

    // Get the snapshot vector clock as a fallback for entities not in the frontier map
    // This prevents false conflicts for entities that haven't been modified since compaction
    const snapshotVectorClock = await this.opLogStore.getSnapshotVectorClock();

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
    this.store.dispatch(loadAllData({ appDataComplete: result.repairedState as any }));

    PFLog.log('[OperationLogSyncService] Created REPAIR operation after sync');
  }
}
