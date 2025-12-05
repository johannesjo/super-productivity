import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry } from '../operation.types';
import { OpLog } from '../../../log';
import { chunkArray } from '../../../../util/chunk-array';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import {
  OperationLogManifestService,
  OPS_DIR,
} from '../store/operation-log-manifest.service';
import { isOperationSyncCapable, syncOpToOperation } from './operation-sync.util';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { MAX_REJECTED_OPS_BEFORE_WARNING } from '../operation-log.const';
import { OperationEncryptionService } from './operation-encryption.service';
import { SuperSyncPrivateCfg } from '../../../../pfapi/api/sync/providers/super-sync/super-sync.model';

/**
 * Result of an upload operation. May contain piggybacked operations
 * from other clients when using API-based sync.
 */
export interface UploadResult {
  uploadedCount: number;
  piggybackedOps: Operation[];
  rejectedCount: number;
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
  private snackService = inject(SnackService);
  private encryptionService = inject(OperationEncryptionService);

  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<UploadResult> {
    if (!syncProvider) {
      OpLog.warn('OperationLogUploadService: No active sync provider passed for upload.');
      return { uploadedCount: 0, piggybackedOps: [], rejectedCount: 0 };
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
    OpLog.normal('OperationLogUploadService: Uploading pending operations via API...');

    const piggybackedOps: Operation[] = [];
    let uploadedCount = 0;
    let rejectedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        OpLog.normal('OperationLogUploadService: No pending operations to upload.');
        return;
      }

      // Get the clientId from the first operation
      const clientId = pendingOps[0].op.clientId;
      const lastKnownServerSeq = await syncProvider.getLastServerSeq();

      // Check if E2E encryption is enabled
      const privateCfg =
        (await syncProvider.privateCfg.load()) as SuperSyncPrivateCfg | null;
      const isEncryptionEnabled =
        privateCfg?.isEncryptionEnabled && !!privateCfg?.encryptKey;
      const encryptKey = privateCfg?.encryptKey;

      // Convert to SyncOperation format
      let syncOps: SyncOperation[] = pendingOps.map((entry) =>
        this._entryToSyncOp(entry),
      );

      // Encrypt payloads if E2E encryption is enabled
      if (isEncryptionEnabled && encryptKey) {
        OpLog.normal('OperationLogUploadService: Encrypting operation payloads...');
        syncOps = await this.encryptionService.encryptOperations(syncOps, encryptKey);
      }

      // Upload in batches (API supports up to 100 ops per request)
      const MAX_OPS_PER_REQUEST = 100;
      const chunks = chunkArray(syncOps, MAX_OPS_PER_REQUEST);
      const correspondingEntries = chunkArray(pendingOps, MAX_OPS_PER_REQUEST);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const entries = correspondingEntries[i];

        OpLog.normal(
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
          OpLog.normal(
            `OperationLogUploadService: Received ${response.newOps.length} piggybacked ops`,
          );
          let piggybackSyncOps = response.newOps.map((serverOp) => serverOp.op);

          // Decrypt piggybacked ops if we have an encryption key
          if (encryptKey) {
            piggybackSyncOps = await this.encryptionService.decryptOperations(
              piggybackSyncOps,
              encryptKey,
            );
          }

          const ops = piggybackSyncOps.map((op) => syncOpToOperation(op));
          piggybackedOps.push(...ops);
        }

        // Handle rejected operations - mark them as permanently rejected
        // This prevents infinite retry loops for invalid operations
        const rejected = response.results.filter((r) => !r.accepted);
        if (rejected.length > 0) {
          const rejectedOpIds = rejected.map((r) => r.opId);
          await this.opLogStore.markRejected(rejectedOpIds);
          rejectedCount += rejected.length;

          OpLog.warn(
            `OperationLogUploadService: ${rejected.length} ops were permanently rejected`,
            rejected.map((r) => ({ opId: r.opId, error: r.error })),
          );
        }
      }

      OpLog.normal(
        `OperationLogUploadService: Uploaded ${uploadedCount} ops via API` +
          (rejectedCount > 0 ? `, ${rejectedCount} rejected` : '.'),
      );
    });

    // Notify user if significant number of ops were rejected
    if (rejectedCount >= MAX_REJECTED_OPS_BEFORE_WARNING) {
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.UPLOAD_OPS_REJECTED,
        translateParams: { count: rejectedCount },
      });
    }

    return { uploadedCount, piggybackedOps, rejectedCount };
  }

  private async _uploadPendingOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<UploadResult> {
    OpLog.normal('OperationLogUploadService: Uploading pending operations via files...');

    let uploadedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      const pendingOps = await this.opLogStore.getUnsynced();

      if (pendingOps.length === 0) {
        OpLog.normal('OperationLogUploadService: No pending operations to upload.');
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
          OpLog.normal(
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
          OpLog.normal(
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

        // Periodically clean up old remote files to prevent unbounded storage growth
        // Run cleanup after every 10 new file uploads to balance overhead vs storage
        if (newFilesUploaded >= 10 || updatedManifestFiles.length > 50) {
          await this.manifestService.cleanupRemoteFiles(syncProvider);
        }
      }

      OpLog.normal(
        `OperationLogUploadService: Successfully uploaded ${newFilesUploaded} new operation files (${uploadedCount} ops).`,
      );
    });

    // File-based sync doesn't support piggybacking or per-op rejection
    return { uploadedCount, piggybackedOps: [], rejectedCount: 0 };
  }

  /**
   * Triggers remote cleanup of old operation files for file-based sync.
   * Can be called manually or scheduled periodically.
   */
  async cleanupRemoteFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<number> {
    if (isOperationSyncCapable(syncProvider)) {
      // API-based sync handles cleanup on server side
      return 0;
    }
    return this.manifestService.cleanupRemoteFiles(syncProvider);
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
