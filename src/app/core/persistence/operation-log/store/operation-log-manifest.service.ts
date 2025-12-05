import { Injectable } from '@angular/core';
import { OperationLogManifest } from '../operation.types';
import { OpLog } from '../../../log';
import { RemoteFileNotFoundAPIError } from '../../../../pfapi/api/errors/errors';
import { SyncProviderServiceInterface } from '../../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';
import {
  REMOTE_COMPACTION_RETENTION_MS,
  MAX_REMOTE_FILES_TO_KEEP,
} from '../operation-log.const';

export const OPS_DIR = 'ops/';
const MANIFEST_FILE_NAME = OPS_DIR + 'manifest.json';
const MANIFEST_VERSION = 1;

/**
 * Manages the operation log manifest file in remote storage.
 * The manifest tracks all uploaded operation files for file-based sync providers.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogManifestService {
  getManifestFileName(): string {
    return MANIFEST_FILE_NAME;
  }

  getManifestVersion(): number {
    return MANIFEST_VERSION;
  }

  createEmptyManifest(): OperationLogManifest {
    return { version: MANIFEST_VERSION, operationFiles: [] };
  }

  async loadRemoteManifest(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<OperationLogManifest> {
    try {
      const fileContent = await syncProvider.downloadFile(this.getManifestFileName());
      const manifest = JSON.parse(fileContent.dataStr) as OperationLogManifest;
      OpLog.normal('OperationLogManifestService: Loaded remote manifest', manifest);
      return manifest;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        OpLog.normal(
          'OperationLogManifestService: Remote manifest not found. Creating new.',
        );
        return this.createEmptyManifest();
      }
      OpLog.error('OperationLogManifestService: Failed to load remote manifest', e);
      throw e;
    }
  }

  async uploadRemoteManifest(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    manifest: OperationLogManifest,
  ): Promise<void> {
    OpLog.normal('OperationLogManifestService: Uploading remote manifest', manifest);
    // Note: revToMatch is null, we always overwrite the manifest for simplicity
    await syncProvider.uploadFile(
      this.getManifestFileName(),
      JSON.stringify(manifest),
      null,
      true, // Force overwrite is important for manifest
    );
  }

  /**
   * Cleans up old remote operation files to prevent unbounded storage growth.
   * Deletes files older than REMOTE_COMPACTION_RETENTION_MS while keeping
   * at least MAX_REMOTE_FILES_TO_KEEP recent files.
   *
   * File timestamps are extracted from filenames (ops_CLIENTID_TIMESTAMP.json).
   *
   * @returns Number of files deleted
   */
  async cleanupRemoteFiles(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
  ): Promise<number> {
    try {
      const manifest = await this.loadRemoteManifest(syncProvider);

      if (manifest.operationFiles.length <= MAX_REMOTE_FILES_TO_KEEP) {
        OpLog.normal(
          `OperationLogManifestService: Only ${manifest.operationFiles.length} remote files, ` +
            `below threshold of ${MAX_REMOTE_FILES_TO_KEEP}. Skipping cleanup.`,
        );
        return 0;
      }

      // Extract timestamps from filenames and sort by age
      const filesWithTimestamps = manifest.operationFiles
        .map((filePath) => ({
          filePath,
          timestamp: this._extractTimestampFromFilename(filePath),
        }))
        .filter((f) => f.timestamp !== null)
        .sort((a, b) => (b.timestamp as number) - (a.timestamp as number)); // newest first

      const cutoffTime = Date.now() - REMOTE_COMPACTION_RETENTION_MS;
      const filesToKeep: string[] = [];
      const filesToDelete: string[] = [];

      for (let i = 0; i < filesWithTimestamps.length; i++) {
        const file = filesWithTimestamps[i];
        // Always keep the most recent MAX_REMOTE_FILES_TO_KEEP files
        if (i < MAX_REMOTE_FILES_TO_KEEP) {
          filesToKeep.push(file.filePath);
        } else if ((file.timestamp as number) < cutoffTime) {
          // Delete files older than retention window
          filesToDelete.push(file.filePath);
        } else {
          filesToKeep.push(file.filePath);
        }
      }

      // Also keep files without parseable timestamps (safety measure)
      const unparsedFiles = manifest.operationFiles.filter(
        (f) => this._extractTimestampFromFilename(f) === null,
      );
      filesToKeep.push(...unparsedFiles);

      if (filesToDelete.length === 0) {
        OpLog.normal(
          'OperationLogManifestService: No remote files eligible for cleanup.',
        );
        return 0;
      }

      OpLog.normal(
        `OperationLogManifestService: Cleaning up ${filesToDelete.length} old remote files...`,
      );

      // Delete files
      let deletedCount = 0;
      for (const filePath of filesToDelete) {
        try {
          await syncProvider.removeFile(filePath);
          deletedCount++;
        } catch (e) {
          // Log but continue - partial cleanup is better than no cleanup
          OpLog.warn(
            `OperationLogManifestService: Failed to delete remote file ${filePath}`,
            e,
          );
        }
      }

      // Update manifest with remaining files
      if (deletedCount > 0) {
        manifest.operationFiles = filesToKeep.sort();
        await this.uploadRemoteManifest(syncProvider, manifest);
        OpLog.normal(
          `OperationLogManifestService: Cleaned up ${deletedCount} remote files. ` +
            `${manifest.operationFiles.length} files remaining.`,
        );
      }

      return deletedCount;
    } catch (e) {
      OpLog.error('OperationLogManifestService: Remote cleanup failed', e);
      // Don't throw - cleanup failure shouldn't break sync
      return 0;
    }
  }

  /**
   * Extracts timestamp from operation file name.
   * Expected format: ops/ops_CLIENTID_TIMESTAMP.json
   * Returns null if filename doesn't match expected format.
   */
  private _extractTimestampFromFilename(filePath: string): number | null {
    // Match pattern: ops_<clientId>_<timestamp>.json
    const match = filePath.match(/ops_[^_]+_(\d+)\.json$/);
    if (match && match[1]) {
      const timestamp = parseInt(match[1], 10);
      // Sanity check: timestamp should be reasonable (after 2020, before 2100)
      const minTimestamp = new Date('2020-01-01').getTime();
      const maxTimestamp = new Date('2100-01-01').getTime();
      if (timestamp >= minTimestamp && timestamp <= maxTimestamp) {
        return timestamp;
      }
    }
    return null;
  }
}
