import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { LockService } from './lock.service';
import {
  ConflictResult,
  EntityConflict,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EntityType,
  Operation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  OperationLogEntry,
  OperationLogManifest,
  VectorClock,
} from './operation.types';
import {
  compareVectorClocks,
  mergeVectorClocks,
  VectorClockComparison,
} from '../../../pfapi/api/util/vector-clock';
import { DependencyResolverService } from './dependency-resolver.service';
import { PFLog } from '../../log';
import { chunkArray } from '../../../util/chunk-array';
// import { convertOpToAction } from './operation-converter.util'; // Removed as no longer directly used here
import { RemoteFileNotFoundAPIError } from '../../../pfapi/api/errors/errors';
import { SyncProviderServiceInterface } from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../pfapi/api/pfapi.const';
import { OperationApplierService } from './operation-applier.service';
import { ConflictResolutionService } from './conflict-resolution.service';

const OPS_DIR = 'ops/';
const MANIFEST_FILE_NAME = OPS_DIR + 'manifest.json';
const MANIFEST_VERSION = 1;

/**
 * Manages the synchronization of the Operation Log with remote storage.
 * This service handles uploading local pending operations, downloading remote operations,
 * and detecting conflicts between local and remote changes based on vector clocks.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogSyncService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private dependencyResolver = inject(DependencyResolverService);
  private operationApplier = inject(OperationApplierService);
  private conflictResolutionService = inject(ConflictResolutionService);

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

    PFLog.normal('OperationLogSyncService: Uploading pending operations...');
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
        } else {
          PFLog.normal(
            `OperationLogSyncService: Skipping upload for existing file ${fullFilePath}`,
          );
        }
        await this.opLogStore.markSynced(chunk.map((e) => e.seq)); // Always mark as synced if already present remotely or just uploaded
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

    PFLog.normal('OperationLogSyncService: Downloading remote operations...');
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
          // Continue with next file
        }
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

      // Apply non-conflicting ops
      await this.operationApplier.applyOperations(nonConflicting);

      // Handle conflicts
      if (conflicts.length > 0) {
        PFLog.warn(
          `OperationLogSyncService: Detected ${conflicts.length} conflicts.`,
          conflicts,
        );
        await this.conflictResolutionService.presentConflicts(conflicts); // Call conflict resolution UI
      }

      PFLog.normal(
        `OperationLogSyncService: Downloaded and processed remote operations.`,
      );
    });
  }

  async detectConflicts(
    remoteOps: Operation[],
    appliedFrontierByEntity: Map<string, VectorClock>,
  ): Promise<ConflictResult> {
    const localPendingOpsByEntity = await this.opLogStore.getUnsyncedByEntity();
    const conflicts: EntityConflict[] = [];
    const nonConflicting: Operation[] = [];

    for (const remoteOp of remoteOps) {
      const entityIdsToCheck =
        remoteOp.entityIds || (remoteOp.entityId ? [remoteOp.entityId] : []);
      let isConflicting = false;

      for (const entityId of entityIdsToCheck) {
        const entityKey = `${remoteOp.entityType}:${entityId}`;
        const localOpsForEntity = localPendingOpsByEntity.get(entityKey) || [];
        const appliedFrontier = appliedFrontierByEntity.get(entityKey); // latest applied vector per entity

        // Build the frontier from everything we know locally (applied + pending)
        const allClocks = [
          ...(appliedFrontier ? [appliedFrontier] : []),
          ...localOpsForEntity.map((op) => op.vectorClock),
        ];
        const localFrontier = allClocks.reduce(
          (acc, clock) => mergeVectorClocks(acc, clock),
          {},
        );

        const vcComparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);

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

      if (!isConflicting) {
        // One happened before the other - can be auto-resolved
        nonConflicting.push(remoteOp);
      }
    }
    return { nonConflicting, conflicts };
  }
}
