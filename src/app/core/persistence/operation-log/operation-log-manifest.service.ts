import { Injectable } from '@angular/core';
import { OperationLogManifest } from './operation.types';
import { PFLog } from '../../log';
import { RemoteFileNotFoundAPIError } from '../../../pfapi/api/errors/errors';
import { SyncProviderServiceInterface } from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../pfapi/api/pfapi.const';

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
      PFLog.normal('OperationLogManifestService: Loaded remote manifest', manifest);
      return manifest;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        PFLog.normal(
          'OperationLogManifestService: Remote manifest not found. Creating new.',
        );
        return this.createEmptyManifest();
      }
      PFLog.error('OperationLogManifestService: Failed to load remote manifest', e);
      throw e;
    }
  }

  async uploadRemoteManifest(
    syncProvider: SyncProviderServiceInterface<SyncProviderId>,
    manifest: OperationLogManifest,
  ): Promise<void> {
    PFLog.normal('OperationLogManifestService: Uploading remote manifest', manifest);
    // Note: revToMatch is null, we always overwrite the manifest for simplicity
    await syncProvider.uploadFile(
      this.getManifestFileName(),
      JSON.stringify(manifest),
      null,
      true, // Force overwrite is important for manifest
    );
  }
}
