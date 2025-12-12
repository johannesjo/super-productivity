import { inject, Injectable } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry } from '../operation.types';
import { OpLog } from '../../../log';
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
import {
  MAX_DOWNLOAD_RETRIES,
  DOWNLOAD_RETRY_BASE_DELAY_MS,
  MAX_DOWNLOAD_OPS_IN_MEMORY,
  CLOCK_DRIFT_THRESHOLD_MS,
} from '../operation-log.const';
import { OperationEncryptionService } from './operation-encryption.service';
import { SuperSyncPrivateCfg } from '../../../../pfapi/api/sync/providers/super-sync/super-sync.model';
import { DecryptError } from '../../../../pfapi/api/errors/errors';

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
  private manifestService = inject(OperationLogManifestService);
  private snackService = inject(SnackService);
  private encryptionService = inject(OperationEncryptionService);

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

    // Use operation sync if supported
    if (isOperationSyncCapable(syncProvider)) {
      return this._downloadRemoteOpsViaApi(syncProvider);
    }

    // Fall back to file-based sync
    return this._downloadRemoteOpsViaFiles(syncProvider);
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

      while (hasMore) {
        const response = await syncProvider.downloadOps(sinceSeq, undefined, 500);
        finalLatestSeq = response.latestSeq;

        // Handle gap detection: server was reset or client has stale lastServerSeq
        if (response.gapDetected && !hasResetForGap) {
          OpLog.warn(
            `OperationLogDownloadService: Gap detected (sinceSeq=${sinceSeq}, latestSeq=${response.latestSeq}). ` +
              `Resetting lastServerSeq to 0 and re-downloading.`,
          );
          // Reset and re-download from the beginning
          sinceSeq = 0;
          hasResetForGap = true;
          allNewOps.length = 0; // Clear any ops we may have accumulated
          await syncProvider.setLastServerSeq(0);
          continue;
        }

        if (response.ops.length === 0) {
          // Update latestSeq even when no ops returned (to stay in sync with server)
          if (response.latestSeq > 0) {
            await syncProvider.setLastServerSeq(response.latestSeq);
          }
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

        // Update the last known server seq
        await syncProvider.setLastServerSeq(response.latestSeq);
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

    return { newOps: allNewOps, success: true, failedFileCount: 0, needsFullStateUpload };
  }

  /**
   * CURRENTLY UNUSED - This method exists for future extensibility but is never called.
   *
   * Why: Operation log sync only runs for providers where `_supportsOpLogSync()` returns true
   * (see sync.service.ts:104). Currently only SuperSync supports this, and SuperSync uses
   * API-based sync (`_downloadRemoteOpsViaApi`), not file-based sync.
   *
   * Legacy providers (WebDAV, Dropbox, LocalFile) skip operation log sync entirely and use
   * pfapi's model-level LWW sync instead.
   *
   * NOTE: This method does NOT decrypt operation payloads. If file-based operation log sync
   * is ever enabled for a provider, decryption support must be added here.
   */
  private async _downloadRemoteOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<DownloadResult> {
    OpLog.normal(
      'OperationLogDownloadService: Downloading remote operations via files...',
    );

    const allNewOps: Operation[] = [];
    let failedFileCount = 0;

    await this.lockService.request('sp_op_log_download', async () => {
      const remoteManifest = await this.manifestService.loadRemoteManifest(syncProvider);
      let remoteOpFileNames: string[] = remoteManifest.operationFiles;

      // Fallback if manifest is empty or listFiles is supported and more files are found
      if (remoteOpFileNames.length === 0 && syncProvider.listFiles) {
        OpLog.normal(
          'OperationLogDownloadService: Manifest is empty, falling back to listFiles to discover ops.',
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
            await this.manifestService.uploadRemoteManifest(syncProvider, remoteManifest);
          }
        } catch (e) {
          OpLog.error(
            'OperationLogDownloadService: Failed to list remote operation files during fallback',
            e,
          );
          return;
        }
      } else if (!syncProvider.listFiles) {
        OpLog.warn(
          'OperationLogDownloadService: Provider does not support listFiles. Relying solely on manifest.',
        );
      }

      if (remoteOpFileNames.length === 0) {
        OpLog.normal('OperationLogDownloadService: No remote operation files found.');
        return;
      }

      const appliedOpIds = await this.opLogStore.getAppliedOpIds();
      const failedFiles: string[] = [];

      for (const fullFilePath of remoteOpFileNames) {
        try {
          const fileContent = await this._downloadFileWithRetry(
            syncProvider,
            fullFilePath,
          );
          const chunk = JSON.parse(fileContent.dataStr) as OperationLogEntry[];
          // Filter already applied ops from this chunk before adding to allNewOps
          const newOpsInChunk = chunk.filter((entry) => !appliedOpIds.has(entry.op.id));
          allNewOps.push(...newOpsInChunk.map((entry) => entry.op));
        } catch (e) {
          OpLog.error(
            `OperationLogDownloadService: Failed to download or parse remote op file ${fullFilePath} after ${MAX_DOWNLOAD_RETRIES} retries`,
            e,
          );
          failedFiles.push(fullFilePath);
        }
      }

      // Warn user about failed downloads
      if (failedFiles.length > 0) {
        failedFileCount = failedFiles.length;
        OpLog.warn(
          `OperationLogDownloadService: ${failedFiles.length} remote operation file(s) failed to download`,
          failedFiles,
        );
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.INCOMPLETE_OP_SYNC,
          translateParams: { count: failedFiles.length },
        });
      }

      OpLog.normal(
        `OperationLogDownloadService: Downloaded ${allNewOps.length} new operations via files.`,
      );
    });

    return {
      newOps: allNewOps,
      success: failedFileCount === 0,
      failedFileCount,
    };
  }

  /**
   * Downloads a file with exponential backoff retry for transient errors.
   * Retries with delays: 1s, 2s, 4s (base * 2^attempt).
   */
  private async _downloadFileWithRetry(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    filePath: string,
  ): Promise<{ dataStr: string }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
      try {
        return await syncProvider.downloadFile(filePath);
      } catch (e) {
        lastError = e;

        if (attempt < MAX_DOWNLOAD_RETRIES) {
          const delay = DOWNLOAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          OpLog.warn(
            `OperationLogDownloadService: Download failed for ${filePath}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_DOWNLOAD_RETRIES})`,
            e,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
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
