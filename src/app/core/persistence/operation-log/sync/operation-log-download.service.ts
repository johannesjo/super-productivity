import { inject, Injectable, Injector } from '@angular/core';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { LockService } from './lock.service';
import { Operation, OperationLogEntry } from '../operation.types';
import { PFLog } from '../../../log';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
} from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import {
  OperationLogManifestService,
  OPS_DIR,
} from '../store/operation-log-manifest.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { isOperationSyncCapable, syncOpToOperation } from './operation-sync.util';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import {
  MAX_DOWNLOAD_RETRIES,
  DOWNLOAD_RETRY_BASE_DELAY_MS,
  MAX_DOWNLOAD_OPS_IN_MEMORY,
} from '../operation-log.const';

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
}

/**
 * Handles downloading remote operations from storage.
 * Supports both API-based sync (for real-time providers) and
 * file-based sync (for WebDAV/file storage providers).
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
  private injector = inject(Injector);

  async downloadRemoteOps(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<DownloadResult> {
    if (!syncProvider) {
      PFLog.warn(
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
    PFLog.normal('OperationLogDownloadService: Downloading remote operations via API...');

    const allNewOps: Operation[] = [];

    await this.lockService.request('sp_op_log_download', async () => {
      // Get clientId at start to avoid race conditions with other tabs
      const pfapiService = this.injector.get(PfapiService);
      const clientId = await pfapiService.pf.metaModel.loadClientId();

      const lastServerSeq = await syncProvider.getLastServerSeq();
      const appliedOpIds = await this.opLogStore.getAppliedOpIds();

      // Download ops in pages
      let hasMore = true;
      let sinceSeq = lastServerSeq;

      while (hasMore) {
        const response = await syncProvider.downloadOps(sinceSeq, undefined, 500);

        if (response.ops.length === 0) {
          break;
        }

        // Convert SyncOperations to Operations, filtering already applied
        const newOps = response.ops
          .filter((serverOp) => !appliedOpIds.has(serverOp.op.id))
          .map((serverOp) => syncOpToOperation(serverOp.op));

        allNewOps.push(...newOps);

        // Bounds check: prevent memory exhaustion
        if (allNewOps.length > MAX_DOWNLOAD_OPS_IN_MEMORY) {
          PFLog.error(
            `OperationLogDownloadService: Too many operations to download (${allNewOps.length}). ` +
              `Stopping at ${MAX_DOWNLOAD_OPS_IN_MEMORY} to prevent memory exhaustion.`,
          );
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.TOO_MANY_OPS_TO_DOWNLOAD,
          });
          // Process what we have so far rather than failing completely
          break;
        }

        // Update cursors
        sinceSeq = response.ops[response.ops.length - 1].serverSeq;
        hasMore = response.hasMore;

        // Update the last known server seq
        await syncProvider.setLastServerSeq(response.latestSeq);
      }

      // Acknowledge that we've processed ops up to the latest seq
      if (allNewOps.length > 0 && clientId) {
        await syncProvider.acknowledgeOps(clientId, sinceSeq);
      }

      PFLog.normal(
        `OperationLogDownloadService: Downloaded ${allNewOps.length} new operations via API.`,
      );
    });

    return { newOps: allNewOps, success: true, failedFileCount: 0 };
  }

  private async _downloadRemoteOpsViaFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<DownloadResult> {
    PFLog.normal(
      'OperationLogDownloadService: Downloading remote operations via files...',
    );

    const allNewOps: Operation[] = [];
    let failedFileCount = 0;

    await this.lockService.request('sp_op_log_download', async () => {
      const remoteManifest = await this.manifestService.loadRemoteManifest(syncProvider);
      let remoteOpFileNames: string[] = remoteManifest.operationFiles;

      // Fallback if manifest is empty or listFiles is supported and more files are found
      if (remoteOpFileNames.length === 0 && syncProvider.listFiles) {
        PFLog.normal(
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
          PFLog.error(
            'OperationLogDownloadService: Failed to list remote operation files during fallback',
            e,
          );
          return;
        }
      } else if (!syncProvider.listFiles) {
        PFLog.warn(
          'OperationLogDownloadService: Provider does not support listFiles. Relying solely on manifest.',
        );
      }

      if (remoteOpFileNames.length === 0) {
        PFLog.normal('OperationLogDownloadService: No remote operation files found.');
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
          PFLog.error(
            `OperationLogDownloadService: Failed to download or parse remote op file ${fullFilePath} after ${MAX_DOWNLOAD_RETRIES} retries`,
            e,
          );
          failedFiles.push(fullFilePath);
        }
      }

      // Warn user about failed downloads
      if (failedFiles.length > 0) {
        failedFileCount = failedFiles.length;
        PFLog.warn(
          `OperationLogDownloadService: ${failedFiles.length} remote operation file(s) failed to download`,
          failedFiles,
        );
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.INCOMPLETE_OP_SYNC,
          translateParams: { count: failedFiles.length },
        });
      }

      PFLog.normal(
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
          PFLog.warn(
            `OperationLogDownloadService: Download failed for ${filePath}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_DOWNLOAD_RETRIES})`,
            e,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
