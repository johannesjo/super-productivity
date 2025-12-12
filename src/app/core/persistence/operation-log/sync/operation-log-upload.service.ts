import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry, OpType } from '../operation.types';
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
import { OperationEncryptionService } from './operation-encryption.service';
import { SuperSyncPrivateCfg } from '../../../../pfapi/api/sync/providers/super-sync/super-sync.model';

/**
 * Operation types that contain full application state and should use
 * the snapshot endpoint instead of the regular ops endpoint.
 */
const FULL_STATE_OP_TYPES = new Set([
  OpType.SyncImport,
  OpType.BackupImport,
  OpType.Repair,
]);

/**
 * Result of an upload operation. May contain piggybacked operations
 * from other clients when using API-based sync.
 */
export interface RejectedOpInfo {
  opId: string;
  error?: string;
}

export interface UploadResult {
  uploadedCount: number;
  piggybackedOps: Operation[];
  rejectedCount: number;
  rejectedOps: RejectedOpInfo[];
}

/**
 * Options for uploadPendingOps.
 */
export interface UploadOptions {
  /**
   * Optional callback executed INSIDE the upload lock, BEFORE checking for pending ops.
   * Use this for operations that must be atomic with the upload, such as server migration checks.
   */
  preUploadCallback?: () => Promise<void>;
}

/**
 * Handles uploading local pending operations to remote storage.
 *
 * CURRENT ARCHITECTURE (as of Dec 2025):
 * - Only SuperSync uses operation log sync (it implements OperationSyncCapable)
 * - SuperSync uses API-based sync via `_uploadPendingOpsViaApi()`
 * - Legacy providers (WebDAV, Dropbox, LocalFile) do NOT use operation log sync at all
 *   They use pfapi's model-level LWW sync instead (see sync.service.ts:104)
 *
 * The file-based sync method `_uploadPendingOpsViaFiles()` exists for future extensibility
 * but is currently NEVER CALLED. If it's ever enabled, encryption support must be added.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogUploadService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private manifestService = inject(OperationLogManifestService);
  private encryptionService = inject(OperationEncryptionService);

  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (!syncProvider) {
      OpLog.warn('OperationLogUploadService: No active sync provider passed for upload.');
      return { uploadedCount: 0, piggybackedOps: [], rejectedCount: 0, rejectedOps: [] };
    }

    // Use operation sync if supported
    if (isOperationSyncCapable(syncProvider)) {
      return this._uploadPendingOpsViaApi(syncProvider, options);
    }

    // Fall back to file-based sync
    return this._uploadPendingOpsViaFiles(syncProvider, options);
  }

  private async _uploadPendingOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    OpLog.normal('OperationLogUploadService: Uploading pending operations via API...');

    const piggybackedOps: Operation[] = [];
    const rejectedOps: RejectedOpInfo[] = [];
    let uploadedCount = 0;
    let rejectedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      // Execute pre-upload callback INSIDE the lock, BEFORE checking for pending ops.
      // This ensures operations like server migration checks are atomic with the upload.
      if (options?.preUploadCallback) {
        await options.preUploadCallback();
      }

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

      // Separate full-state operations (backup imports, repairs) from regular ops
      // Full-state ops are uploaded via snapshot endpoint for better efficiency
      const fullStateOps = pendingOps.filter((entry) =>
        FULL_STATE_OP_TYPES.has(entry.op.opType as OpType),
      );
      const regularOps = pendingOps.filter(
        (entry) => !FULL_STATE_OP_TYPES.has(entry.op.opType as OpType),
      );

      // Upload full-state operations via snapshot endpoint
      for (const entry of fullStateOps) {
        const result = await this._uploadFullStateOpAsSnapshot(
          syncProvider,
          entry,
          encryptKey,
        );
        if (result.accepted) {
          await this.opLogStore.markSynced([entry.seq]);
          uploadedCount++;
          if (result.serverSeq !== undefined) {
            await syncProvider.setLastServerSeq(result.serverSeq);
          }
        } else {
          // Only permanently reject if the server explicitly rejected the operation
          // (e.g., validation error, conflict). Network errors should be retried.
          const isNetworkError = this._isNetworkError(result.error);
          if (isNetworkError) {
            OpLog.warn(
              `OperationLogUploadService: Full-state op ${entry.op.id} failed due to network error, will retry: ${result.error}`,
            );
            // Don't mark as rejected - leave as unsynced for retry
          } else {
            await this.opLogStore.markRejected([entry.op.id]);
            rejectedOps.push({ opId: entry.op.id, error: result.error });
            rejectedCount++;
            OpLog.warn(
              `OperationLogUploadService: Full-state op ${entry.op.id} rejected: ${result.error}`,
            );
          }
        }
      }

      // Skip regular ops processing if none exist
      if (regularOps.length === 0) {
        return;
      }

      // Convert to SyncOperation format
      let syncOps: SyncOperation[] = regularOps.map((entry) =>
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
      const correspondingEntries = chunkArray(regularOps, MAX_OPS_PER_REQUEST);

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

          // Decrypt piggybacked ops if any are encrypted and we have a key
          const hasEncryptedOps = piggybackSyncOps.some((op) => op.isPayloadEncrypted);
          if (hasEncryptedOps && encryptKey) {
            piggybackSyncOps = await this.encryptionService.decryptOperations(
              piggybackSyncOps,
              encryptKey,
            );
          }

          const ops = piggybackSyncOps.map((op) => syncOpToOperation(op));
          piggybackedOps.push(...ops);
        }

        // Collect rejected operations - DO NOT mark as rejected here!
        // The sync service must process piggybacked ops FIRST to allow proper conflict detection.
        // If we mark rejected before processing piggybacked ops, the local ops won't be in the
        // pending list, conflict detection won't find them, and user's changes are silently lost.
        const rejected = response.results.filter((r) => !r.accepted);
        if (rejected.length > 0) {
          for (const r of rejected) {
            rejectedOps.push({ opId: r.opId, error: r.error });
          }
          rejectedCount += rejected.length;

          OpLog.warn(
            `OperationLogUploadService: ${rejected.length} ops were rejected by server (will be handled after piggybacked ops)`,
            rejected.map((r) => ({ opId: r.opId, error: r.error })),
          );
        }
      }

      OpLog.normal(
        `OperationLogUploadService: Uploaded ${uploadedCount} ops via API` +
          (rejectedCount > 0 ? `, ${rejectedCount} rejected` : '.'),
      );
    });

    // Note: We no longer show the rejection warning here since rejections
    // may be resolved via conflict dialog. The sync service handles this.

    return { uploadedCount, piggybackedOps, rejectedCount, rejectedOps };
  }

  /**
   * CURRENTLY UNUSED - This method exists for future extensibility but is never called.
   *
   * Why: Operation log sync only runs for providers where `_supportsOpLogSync()` returns true
   * (see sync.service.ts:104). Currently only SuperSync supports this, and SuperSync uses
   * API-based sync (`_uploadPendingOpsViaApi`), not file-based sync.
   *
   * Legacy providers (WebDAV, Dropbox, LocalFile) skip operation log sync entirely and use
   * pfapi's model-level LWW sync instead.
   *
   * NOTE: This method does NOT encrypt operation payloads. If file-based operation log sync
   * is ever enabled for a provider, encryption support must be added here.
   */
  private async _uploadPendingOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    OpLog.normal('OperationLogUploadService: Uploading pending operations via files...');

    let uploadedCount = 0;

    await this.lockService.request('sp_op_log_upload', async () => {
      // Execute pre-upload callback INSIDE the lock, BEFORE checking for pending ops.
      if (options?.preUploadCallback) {
        await options.preUploadCallback();
      }

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
    return { uploadedCount, piggybackedOps: [], rejectedCount: 0, rejectedOps: [] };
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

  /**
   * Uploads a full-state operation (backup import, repair, sync import) via
   * the snapshot endpoint instead of the ops endpoint. This is more efficient
   * for large payloads as the snapshot endpoint is designed for full state uploads.
   */
  private async _uploadFullStateOpAsSnapshot(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
    entry: OperationLogEntry,
    encryptKey: string | undefined,
  ): Promise<{ accepted: boolean; serverSeq?: number; error?: string }> {
    const op = entry.op;
    OpLog.normal(
      `OperationLogUploadService: Uploading ${op.opType} operation via snapshot endpoint`,
    );

    // The payload for full-state ops IS the complete state
    let state = op.payload;

    // If encryption is enabled, encrypt the state
    if (encryptKey) {
      OpLog.normal('OperationLogUploadService: Encrypting snapshot payload...');
      state = await this.encryptionService.encryptPayload(state, encryptKey);
    }

    // Map operation type to snapshot reason
    const reason = this._opTypeToSnapshotReason(op.opType as OpType);

    try {
      const response = await syncProvider.uploadSnapshot(
        state,
        op.clientId,
        reason,
        op.vectorClock,
        op.schemaVersion,
      );
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      OpLog.error(`OperationLogUploadService: Snapshot upload failed: ${message}`);
      return { accepted: false, error: message };
    }
  }

  /**
   * Maps an OpType to the snapshot reason expected by the server.
   */
  private _opTypeToSnapshotReason(opType: OpType): 'initial' | 'recovery' | 'migration' {
    switch (opType) {
      case OpType.SyncImport:
        return 'initial';
      case OpType.BackupImport:
        return 'recovery';
      case OpType.Repair:
        return 'recovery';
      default:
        return 'recovery';
    }
  }

  /**
   * Determines if an error message indicates a transient error
   * that should be retried, vs a permanent server rejection.
   *
   * Transient errors include:
   * - Network errors (failed to fetch, timeout, etc.)
   * - Server internal errors (transaction timeout, server busy)
   *
   * Permanent rejections are typically validation errors (invalid payload,
   * duplicate operation, conflict, etc.) that won't succeed on retry.
   */
  private _isNetworkError(error: string | undefined): boolean {
    if (!error) return false;
    const transientErrorPatterns = [
      // Network errors
      'failed to fetch',
      'network',
      'timeout',
      'econnrefused',
      'enotfound',
      'cors',
      'net::',
      'offline',
      'aborted',
      // Server transient errors
      'server busy',
      'please retry',
      'transaction rolled back',
      'internal server error',
      '500',
      '502',
      '503',
      '504',
    ];
    const lowerError = error.toLowerCase();
    return transientErrorPatterns.some((pattern) => lowerError.includes(pattern));
  }
}
