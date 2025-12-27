import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry, OpType } from '../operation.types';
import { OpLog } from '../../../log';
import { LOCK_NAMES } from '../operation-log.const';
import { chunkArray } from '../../../../util/chunk-array';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
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
  errorCode?: string;
}

export interface UploadResult {
  uploadedCount: number;
  piggybackedOps: Operation[];
  rejectedCount: number;
  rejectedOps: RejectedOpInfo[];
  /**
   * Number of local-win update ops created during LWW conflict resolution.
   * These ops need to be uploaded to propagate local state to other clients.
   * Set by OperationLogSyncService.uploadPendingOps after processing piggybacked ops.
   */
  localWinOpsCreated?: number;
  /**
   * True when piggybacked ops were limited (more ops exist on server).
   * Caller should trigger a download to get the remaining operations.
   */
  hasMorePiggyback?: boolean;
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
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogUploadService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private encryptionService = inject(OperationEncryptionService);

  async uploadPendingOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (!syncProvider) {
      OpLog.warn('OperationLogUploadService: No active sync provider passed for upload.');
      return { uploadedCount: 0, piggybackedOps: [], rejectedCount: 0, rejectedOps: [] };
    }

    // Operation log sync requires an API-capable provider
    if (!isOperationSyncCapable(syncProvider)) {
      OpLog.error(
        'OperationLogUploadService: Sync provider does not support operation sync.',
      );
      return { uploadedCount: 0, piggybackedOps: [], rejectedCount: 0, rejectedOps: [] };
    }

    return this._uploadPendingOpsViaApi(syncProvider, options);
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
    let hasMorePiggyback = false;

    await this.lockService.request(LOCK_NAMES.UPLOAD, async () => {
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
      // Use let so we can update between chunks to avoid duplicate piggybacked ops
      let lastKnownServerSeq = await syncProvider.getLastServerSeq();
      // Track highest received sequence across ALL chunks to prevent regression
      let highestReceivedSeq = lastKnownServerSeq;

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

      // Upload in batches (reduced from 100 to avoid 413 Payload Too Large errors)
      const MAX_OPS_PER_REQUEST = 25;
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

        // Collect piggybacked new ops from other clients
        if (response.newOps && response.newOps.length > 0) {
          OpLog.normal(
            `OperationLogUploadService: Received ${response.newOps.length} piggybacked ops` +
              (response.hasMorePiggyback ? ' (more available on server)' : ''),
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

        // Update last known server seq
        // When hasMorePiggyback is true, use the max piggybacked op's serverSeq
        // so subsequent download will fetch remaining ops
        let seqToStore = response.latestSeq;
        if (response.hasMorePiggyback) {
          hasMorePiggyback = true;
          if (response.newOps && response.newOps.length > 0) {
            const maxPiggybackSeq = Math.max(
              ...response.newOps.map((op) => op.serverSeq),
            );
            // Use Math.max to ensure we never regress across chunks
            highestReceivedSeq = Math.max(highestReceivedSeq, maxPiggybackSeq);
            seqToStore = highestReceivedSeq;
            OpLog.normal(
              `OperationLogUploadService: hasMorePiggyback=true, setting lastServerSeq to ${seqToStore} instead of ${response.latestSeq}`,
            );
          } else {
            // Server indicates more ops but didn't send any - don't advance sequence
            // Use highestReceivedSeq to ensure we don't regress from previous chunks
            seqToStore = highestReceivedSeq;
            OpLog.warn(
              `OperationLogUploadService: hasMorePiggyback=true but no ops received, keeping lastServerSeq at ${highestReceivedSeq}`,
            );
          }
        } else {
          // No more piggyback, but still ensure we don't regress
          highestReceivedSeq = Math.max(highestReceivedSeq, response.latestSeq);
          seqToStore = highestReceivedSeq;
        }
        await syncProvider.setLastServerSeq(seqToStore);
        lastKnownServerSeq = seqToStore;

        // Collect rejected operations - DO NOT mark as rejected here!
        // The sync service must process piggybacked ops FIRST to allow proper conflict detection.
        // If we mark rejected before processing piggybacked ops, the local ops won't be in the
        // pending list, conflict detection won't find them, and user's changes are silently lost.
        const rejected = response.results.filter((r) => !r.accepted);
        if (rejected.length > 0) {
          for (const r of rejected) {
            rejectedOps.push({ opId: r.opId, error: r.error, errorCode: r.errorCode });
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

    return {
      uploadedCount,
      piggybackedOps,
      rejectedCount,
      rejectedOps,
      ...(hasMorePiggyback ? { hasMorePiggyback: true } : {}),
    };
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
    const isPayloadEncrypted = !!encryptKey;

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
        isPayloadEncrypted,
      );
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      OpLog.error(`OperationLogUploadService: Snapshot upload failed: ${message}`);

      // Check for storage quota exceeded - show strong alert
      if (
        message.includes('STORAGE_QUOTA_EXCEEDED') ||
        message.includes('Storage quota exceeded')
      ) {
        alert(
          'Sync storage is full! Your data is NOT syncing to the server. ' +
            'Please archive old tasks or upgrade your plan to continue syncing.',
        );
      }

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
   *
   * Uses regex patterns with word boundaries for more precise matching,
   * avoiding false positives like "not a network error".
   */
  private _isNetworkError(error: string | undefined): boolean {
    if (!error) return false;

    const lowerError = error.toLowerCase();

    // Use regex patterns for more precise matching
    const transientErrorPatterns: RegExp[] = [
      // Network/fetch errors - use word boundaries to avoid false positives
      /\bfailed to fetch\b/,
      /\bnetwork\s*(error|request|failure)?\b/, // "network error", "network request", "network"
      /\btimeout\b/,
      /\beconnrefused\b/,
      /\benotfound\b/,
      /\bcors\b/,
      /\bnet::/,
      /\boffline\b/,
      /\baborted\b/,
      /\bconnection\s*(refused|reset|closed)\b/,
      /\bsocket\s*(hang up|closed)\b/,
      // Server transient errors
      /\bserver\s*busy\b/,
      /\bplease\s*retry\b/,
      /\btransaction\s*rolled\s*back\b/,
      /\binternal\s*server\s*error\b/,
      // HTTP status codes - match as words to avoid matching in other contexts
      /\b500\b/,
      /\b502\b/,
      /\b503\b/,
      /\b504\b/,
      /\bservice\s*unavailable\b/,
      /\bgateway\s*timeout\b/,
    ];

    return transientErrorPatterns.some((pattern) => pattern.test(lowerError));
  }
}
