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
 * The file-based sync method `_downloadRemoteOpsViaFiles()` exists for future extensibility
 * but is currently NEVER CALLED. If it's ever enabled, decryption support must be added.
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

    return this._downloadRemoteOpsViaApi(syncProvider);
  }

  private async _downloadRemoteOpsViaApi(
    syncProvider: SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable,
  ): Promise<DownloadResult> {
    OpLog.normal('OperationLogDownloadService: Downloading remote operations via API...');

    const allNewOps: Operation[] = [];
    let downloadFailed = false;
    let needsFullStateUpload = false;
    let finalLatestSeq = 0;

    // Get encryption key upfront
    const privateCfg =
      (await syncProvider.privateCfg.load()) as SuperSyncPrivateCfg | null;
    const encryptKey = privateCfg?.encryptKey;

    await this.lockService.request('sp_op_log_download', async () => {
      const lastServerSeq = await syncProvider.getLastServerSeq();
      const appliedOpIds = await this.opLogStore.getAppliedOpIds();

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
          // NOTE: Don't persist lastServerSeq=0 here - caller will persist the final value
          // after ops are stored in IndexedDB. This ensures localStorage and IndexedDB stay in sync.
          continue;
        }

        if (response.ops.length === 0) {
          // No ops to download - caller will persist latestServerSeq after this method returns
          break;
        }

        // Check for clock drift using server's receivedAt timestamp
        this._checkClockDrift(response.ops[0].receivedAt);

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
    };
  }

  /**
   * Checks for significant clock drift between client and server.
   * Warns user once per session if drift exceeds threshold.
   */
  private _checkClockDrift(serverTimestamp: number): void {
    if (this.hasWarnedClockDrift) {
      return;
    }

    const drift = Date.now() - serverTimestamp;
    const driftMinutes = Math.abs(drift) / 60000;

    if (driftMinutes > CLOCK_DRIFT_THRESHOLD_MS / 60000) {
      this.hasWarnedClockDrift = true;
      OpLog.warn('OperationLogDownloadService: Clock drift detected', {
        driftMinutes: driftMinutes.toFixed(1),
        direction: drift > 0 ? 'client ahead' : 'client behind',
      });
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.CLOCK_DRIFT_WARNING,
        translateParams: { minutes: Math.round(driftMinutes) },
      });
    }
  }
}
