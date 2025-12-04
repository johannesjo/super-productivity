import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry } from './operation.types';
import { PFLog } from '../../log';
import { chunkArray } from '../../../util/chunk-array';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../pfapi/api/pfapi.const';
import { OperationLogManifestService, OPS_DIR } from './operation-log-manifest.service';
import { isOperationSyncCapable, syncOpToOperation } from './operation-sync.util';

/**
 * Result of an upload operation. May contain piggybacked operations
 * from other clients when using API-based sync.
 */
export interface UploadResult {
  uploadedCount: number;
  piggybackedOps: Operation[];
}

/**
 * Handles uploading local pending operations to remote storage.
 * Supports both API-based sync (for real-time providers) and
 * file-based sync (for WebDAV/file storage providers).
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogUploadService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private manifestService = inject(OperationLogManifestService);

  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<UploadResult> {
    if (!syncProvider) {
      PFLog.warn('OperationLogUploadService: No active sync provider passed for upload.');
      return { uploadedCount: 0, piggybackedOps: [] };
    }

    // Use operation sync if supported
    if (isOperationSyncCapable(syncProvider)) {
      return this._uploadPendingOpsViaApi(syncProvider);
    }

    // Fall back to file-based sync
    return this._uploadPendingOpsViaFiles(syncProvider);
  }

  private async _uploadPendingOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
  ): Promise<UploadResult> {
    PFLog.normal('OperationLogUploadService: Uploading pending operations via API...');

    const piggybackedOps: Operation[] = [];
    let uploadedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        PFLog.normal('OperationLogUploadService: No pending operations to upload.');
        return;
      }

      // Get the clientId from the first operation
      const clientId = pendingOps[0].op.clientId;
      const lastKnownServerSeq = await syncProvider.getLastServerSeq();

      // Convert to SyncOperation format
      const syncOps: SyncOperation[] = pendingOps.map((entry) =>
        this._entryToSyncOp(entry),
      );

      // Upload in batches (API supports up to 100 ops per request)
      const MAX_OPS_PER_REQUEST = 100;
      const chunks = chunkArray(syncOps, MAX_OPS_PER_REQUEST);
      const correspondingEntries = chunkArray(pendingOps, MAX_OPS_PER_REQUEST);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const entries = correspondingEntries[i];

        PFLog.normal(
          `OperationLogUploadService: Uploading batch of ${chunk.length} ops via API`,
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
          uploadedCount += acceptedSeqs.length;
        }

        // Update last known server seq
        await syncProvider.setLastServerSeq(response.latestSeq);

        // Collect piggybacked new ops from other clients
        if (response.newOps && response.newOps.length > 0) {
          PFLog.normal(
            `OperationLogUploadService: Received ${response.newOps.length} piggybacked ops`,
          );
          const ops = response.newOps.map((serverOp) => syncOpToOperation(serverOp.op));
          piggybackedOps.push(...ops);
        }

        // Log any rejected operations
        const rejected = response.results.filter((r) => !r.accepted);
        if (rejected.length > 0) {
          PFLog.warn(
            `OperationLogUploadService: ${rejected.length} ops were rejected`,
            rejected,
          );
        }
      }

      PFLog.normal(
        `OperationLogUploadService: Successfully uploaded ${uploadedCount} ops via API.`,
      );
    });

    return { uploadedCount, piggybackedOps };
  }

  private async _uploadPendingOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<UploadResult> {
    PFLog.normal('OperationLogUploadService: Uploading pending operations via files...');

    let uploadedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        PFLog.normal('OperationLogUploadService: No pending operations to upload.');
        return;
      }

      const remoteManifest = await this.manifestService.loadRemoteManifest(syncProvider);
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
            `OperationLogUploadService: Uploading ${chunk.length} ops to ${fullFilePath}`,
          );
          // revToMatch is null, as these are new files
          await syncProvider.uploadFile(fullFilePath, JSON.stringify(chunk), null);
          updatedManifestFiles.push(fullFilePath);
          newFilesUploaded++;
          // Only mark as synced after successful upload
          await this.opLogStore.markSynced(chunk.map((e) => e.seq));
          uploadedCount += chunk.length;
        } else {
          PFLog.normal(
            `OperationLogUploadService: Skipping upload for existing file ${fullFilePath}`,
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
        await this.manifestService.uploadRemoteManifest(syncProvider, remoteManifest);
      }

      PFLog.normal(
        `OperationLogUploadService: Successfully uploaded ${newFilesUploaded} new operation files (${uploadedCount} ops).`,
      );
    });

    // File-based sync doesn't support piggybacking
    return { uploadedCount, piggybackedOps: [] };
  }

  private _entryToSyncOp(entry: OperationLogEntry): SyncOperation {
    return {
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
    };
  }
}
