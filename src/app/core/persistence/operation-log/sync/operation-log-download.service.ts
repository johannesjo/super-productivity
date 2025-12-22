import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation } from '../operation.types';
import { OpLog } from '../../../log';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import { isOperationSyncCapable, syncOpToOperation } from './operation-sync.util';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import {
  MAX_DOWNLOAD_OPS_IN_MEMORY,
  MAX_DOWNLOAD_ITERATIONS,
  CLOCK_DRIFT_THRESHOLD_MS,
} from '../operation-log.const';
import { OperationEncryptionService } from './operation-encryption.service';
import { SuperSyncPrivateCfg } from '../../../../pfapi/api/sync/providers/super-sync/super-sync.model';
import { DecryptError } from '../../../../pfapi/api/errors/errors';
import { SuperSyncStatusService } from './super-sync-status.service';

/**
 * Result of a download operation.
 */
export interface DownloadResult {
  /** New operations that need to be processed */
  newOps: Operation[];
  /** Whether download completed successfully (vs partial/failed) */
  success: boolean;
  /** Number of files that failed to download (file-based sync only) */
  failedFileCount: number;
  /**
   * True when gap detected on empty server - indicates server migration scenario.
   * When true, the client should upload a full state snapshot before regular ops
   * to ensure all data is transferred to the new server.
   */
  needsFullStateUpload?: boolean;
  /**
   * The server's latest sequence number after download.
   * IMPORTANT: Caller must persist this to lastServerSeq AFTER storing ops to IndexedDB.
   * This ensures localStorage and IndexedDB stay in sync even if the app crashes.
   */
  latestServerSeq?: number;
  /**
   * All operation clocks seen during download, INCLUDING duplicates that were filtered out.
   * This is populated when forceFromSeq0 is true, allowing callers to rebuild their
   * vector clock state from all known ops on the server.
   */
  allOpClocks?: import('../operation.types').VectorClock[];
  /**
   * Aggregated vector clock from all ops before and including the snapshot.
   * Only set when snapshot optimization is used (sinceSeq < latestSnapshotSeq).
   * Clients need this to create merged updates that dominate all known clocks.
   */
  snapshotVectorClock?: import('../operation.types').VectorClock;
}

/**
 * Handles downloading remote operations from storage.
 *
 * CURRENT ARCHITECTURE (as of Dec 2025):
 * - Only SuperSync uses operation log sync (it implements OperationSyncCapable)
 * - SuperSync uses API-based sync via `_downloadRemoteOpsViaApi()`
 * - Legacy providers (WebDAV, Dropbox, LocalFile) do NOT use operation log sync at all
 *   They use pfapi's model-level LWW sync instead (see sync.service.ts:104)
 *
 * This service only handles downloading and filtering - conflict detection
 * and application are handled by OperationLogSyncService.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogDownloadService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private snackService = inject(SnackService);
  private encryptionService = inject(OperationEncryptionService);
  private superSyncStatusService = inject(SuperSyncStatusService);

  /** Track if we've already warned about clock drift this session */
  private hasWarnedClockDrift = false;

  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    options?: { forceFromSeq0?: boolean },
  ): Promise<DownloadResult> {
    if (!syncProvider) {
      OpLog.warn(
        'OperationLogDownloadService: No active sync provider passed for download.',
      );
      return { newOps: [], success: false, failedFileCount: 0 };
    }

    // Operation log sync requires an API-capable provider
    if (!isOperationSyncCapable(syncProvider)) {
      OpLog.error(
        'OperationLogDownloadService: Sync provider does not support operation sync.',
      );
      return { newOps: [], success: false, failedFileCount: 0 };
    }

    return this._downloadRemoteOpsViaApi(syncProvider, options);
  }

  private async _downloadRemoteOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
    options?: { forceFromSeq0?: boolean },
  ): Promise<DownloadResult> {
    const forceFromSeq0 = options?.forceFromSeq0 ?? false;
    OpLog.normal(
      `OperationLogDownloadService: Downloading remote operations via API...${forceFromSeq0 ? ' (forced from seq 0)' : ''}`,
    );

    const allNewOps: Operation[] = [];
    const allOpClocks: import('../operation.types').VectorClock[] = [];
    let downloadFailed = false;
    let needsFullStateUpload = false;
    let finalLatestSeq = 0;
    let snapshotVectorClock: import('../operation.types').VectorClock | undefined;

    // Get encryption key upfront
    const privateCfg =
      (await syncProvider.privateCfg.load()) as SuperSyncPrivateCfg | null;
    const encryptKey = privateCfg?.encryptKey;

    // Set scope for status service to ensure status is per-server/account
    if (privateCfg?.baseUrl && privateCfg?.accessToken) {
      const scopeId = this._generateScopeId(privateCfg.baseUrl, privateCfg.accessToken);
      this.superSyncStatusService.setScope(scopeId);
    }

    await this.lockService.request('sp_op_log_download', async () => {
      const lastServerSeq = forceFromSeq0 ? 0 : await syncProvider.getLastServerSeq();
      const appliedOpIds = await this.opLogStore.getAppliedOpIds();

      if (forceFromSeq0) {
        OpLog.warn(
          'OperationLogDownloadService: Forced download from seq 0 to rebuild clock state',
        );
      }

      // Download ops in pages
      let hasMore = true;
      let sinceSeq = lastServerSeq;
      let hasResetForGap = false;
      let iterationCount = 0;

      while (hasMore) {
        iterationCount++;
        if (iterationCount > MAX_DOWNLOAD_ITERATIONS) {
          OpLog.error(
            `OperationLogDownloadService: Exceeded max iterations (${MAX_DOWNLOAD_ITERATIONS}). ` +
              `Server may have a bug returning hasMore=true indefinitely.`,
          );
          downloadFailed = true;
          break;
        }

        const response = await syncProvider.downloadOps(sinceSeq, undefined, 500);
        finalLatestSeq = response.latestSeq;

        // Capture snapshot vector clock from first response (only present when snapshot optimization used)
        if (!snapshotVectorClock && response.snapshotVectorClock) {
          snapshotVectorClock = response.snapshotVectorClock;
          OpLog.normal(
            `OperationLogDownloadService: Received snapshotVectorClock with ${Object.keys(snapshotVectorClock).length} entries`,
          );
        }

        // Handle gap detection: server was reset or client has stale lastServerSeq
        if (response.gapDetected && !hasResetForGap) {
          OpLog.warn(
            `OperationLogDownloadService: Gap detected (sinceSeq=${sinceSeq}, latestSeq=${response.latestSeq}). ` +
              `Resetting to 0 and re-downloading.`,
          );
          // Reset and re-download from the beginning
          sinceSeq = 0;
          hasResetForGap = true;
          allNewOps.length = 0; // Clear any ops we may have accumulated
          allOpClocks.length = 0; // Clear clocks too
          snapshotVectorClock = undefined; // Clear snapshot clock to capture fresh one after reset
          // NOTE: Don't persist lastServerSeq=0 here - caller will persist the final value
          // after ops are stored in IndexedDB. This ensures localStorage and IndexedDB stay in sync.
          continue;
        }

        if (response.ops.length === 0) {
          // No ops to download - caller will persist latestServerSeq after this method returns
          break;
        }

        // Check for clock drift using server's current time (if provided)
        // NOTE: We use serverTime (current server time) instead of receivedAt (when ops were uploaded)
        // because receivedAt can be hours old and would falsely trigger clock drift warnings.
        if (response.serverTime !== undefined) {
          this._checkClockDrift(response.serverTime);
        }

        // When force downloading from seq 0, capture ALL op clocks (including duplicates)
        // This allows rebuilding vector clock state from all known ops on the server
        if (forceFromSeq0) {
          for (const serverOp of response.ops) {
            if (serverOp.op.vectorClock) {
              allOpClocks.push(serverOp.op.vectorClock);
            }
          }
        }

        // Filter already applied ops
        let syncOps: SyncOperation[] = response.ops
          .filter((serverOp) => !appliedOpIds.has(serverOp.op.id))
          .map((serverOp) => serverOp.op);

        // Decrypt encrypted operations if we have an encryption key
        const hasEncryptedOps = syncOps.some((op) => op.isPayloadEncrypted);
        if (hasEncryptedOps) {
          if (!encryptKey) {
            // No encryption key available - fail with a helpful message
            OpLog.error(
              'OperationLogDownloadService: Received encrypted operations but no encryption key is configured.',
            );
            this.snackService.open({
              type: 'ERROR',
              msg: T.F.SYNC.S.ENCRYPTION_PASSWORD_REQUIRED,
            });
            downloadFailed = true;
            return;
          }

          try {
            syncOps = await this.encryptionService.decryptOperations(syncOps, encryptKey);
          } catch (e) {
            if (e instanceof DecryptError) {
              OpLog.error(
                'OperationLogDownloadService: Failed to decrypt operations. Wrong encryption password?',
                e,
              );
              this.snackService.open({
                type: 'ERROR',
                msg: T.F.SYNC.S.DECRYPTION_FAILED,
              });
              downloadFailed = true;
              return;
            }
            throw e;
          }
        }

        // Convert to Operation format
        const newOps = syncOps.map((op) => syncOpToOperation(op));
        allNewOps.push(...newOps);

        // Bounds check: prevent memory exhaustion
        if (allNewOps.length > MAX_DOWNLOAD_OPS_IN_MEMORY) {
          OpLog.error(
            `OperationLogDownloadService: Too many operations to download (${allNewOps.length}). ` +
              `Stopping at ${MAX_DOWNLOAD_OPS_IN_MEMORY} to prevent memory exhaustion.`,
          );
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.TOO_MANY_OPS_TO_DOWNLOAD,
          });
          // Process what we have so far rather than failing completely
          downloadFailed = true;
          break;
        }

        // Update cursors
        sinceSeq = response.ops[response.ops.length - 1].serverSeq;
        hasMore = response.hasMore;

        // Monotonicity check: warn if server seq decreased (indicates potential server bug)
        if (response.latestSeq < lastServerSeq) {
          OpLog.warn(
            `OperationLogDownloadService: Server sequence decreased from ${lastServerSeq} to ${response.latestSeq}. ` +
              `This may indicate a server bug or data loss.`,
          );
        }

        // NOTE: Don't persist lastServerSeq here - caller will persist it after ops are
        // stored in IndexedDB. This ensures localStorage and IndexedDB stay in sync.
      }

      // NOTE: We don't call acknowledgeOps here anymore.
      // ACK was used for server-side garbage collection, but the server already
      // cleans up stale devices after 50 days (STALE_DEVICE_THRESHOLD_MS).
      // Removing ACK simplifies the flow and avoids issues with fresh clients
      // (device not registered until first upload would cause 403 errors).

      // Server migration detection:
      // If we detected a gap AND the server is empty (no ops to download),
      // this indicates a server migration scenario. The client should upload
      // a full state snapshot to seed the new server with its data.
      if (hasResetForGap && allNewOps.length === 0 && finalLatestSeq === 0) {
        needsFullStateUpload = true;
        OpLog.warn(
          'OperationLogDownloadService: Server migration detected - gap on empty server. ' +
            'Full state upload will be required.',
        );
      }

      OpLog.normal(
        `OperationLogDownloadService: Downloaded ${allNewOps.length} new operations via API.`,
      );
    });

    if (downloadFailed) {
      return { newOps: [], success: false, failedFileCount: 0 };
    }

    // Mark that we successfully checked the remote server
    this.superSyncStatusService.markRemoteChecked();

    // Return latestServerSeq so caller can persist it AFTER storing ops in IndexedDB.
    // This ensures localStorage (lastServerSeq) and IndexedDB (ops) stay in sync.
    return {
      newOps: allNewOps,
      success: true,
      failedFileCount: 0,
      needsFullStateUpload,
      latestServerSeq: finalLatestSeq,
      // Include all op clocks when force downloading from seq 0
      ...(forceFromSeq0 && allOpClocks.length > 0 ? { allOpClocks } : {}),
      // Include snapshot vector clock when snapshot optimization was used
      ...(snapshotVectorClock ? { snapshotVectorClock } : {}),
    };
  }

  /**
   * Checks for significant clock drift between client and server.
   * Warns user once per session if drift exceeds threshold.
   * Retries once after 1 second to handle transient drift after device wake-up.
   */
  private _checkClockDrift(serverTimestamp: number): void {
    if (this.hasWarnedClockDrift) {
      return;
    }

    const getDriftMinutes = (): number => Math.abs(Date.now() - serverTimestamp) / 60000;
    const thresholdMinutes = CLOCK_DRIFT_THRESHOLD_MS / 60000;

    const driftMinutes = getDriftMinutes();

    if (driftMinutes > thresholdMinutes) {
      // Retry after 1 second - clock may sync after device wake-up
      setTimeout(() => {
        if (this.hasWarnedClockDrift) {
          return;
        }
        const retryDriftMinutes = getDriftMinutes();
        if (retryDriftMinutes > thresholdMinutes) {
          this.hasWarnedClockDrift = true;
          const retryDrift = Date.now() - serverTimestamp;
          OpLog.warn('OperationLogDownloadService: Clock drift detected', {
            driftMinutes: retryDriftMinutes.toFixed(1),
            direction: retryDrift > 0 ? 'client ahead' : 'client behind',
          });
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.CLOCK_DRIFT_WARNING,
            translateParams: { minutes: Math.round(retryDriftMinutes) },
          });
        }
      }, 1000);
    }
  }

  /**
   * Generate a scope ID from the server URL and access token.
   * Uses the same hashing algorithm as SuperSyncProvider for consistency.
   */
  private _generateScopeId(baseUrl: string, accessToken: string): string {
    const identifier = `${baseUrl}|${accessToken}`;
    const hash = identifier
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(16);
    return hash;
  }
}
