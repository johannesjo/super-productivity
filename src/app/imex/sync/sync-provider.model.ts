import { Observable } from 'rxjs';
import { DropboxFileMetadata } from './dropbox/dropbox.model';
import { AppDataComplete, SyncGetRevResult } from './sync.model';
import { GoogleDriveFileMeta } from './google/google-api.model';

// NOTE: do not change!!
export enum SyncProvider {
  'GoogleDrive' = 'GoogleDrive',
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
}

export type SyncFileMeta = DropboxFileMetadata | GoogleDriveFileMeta;

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean>;

  getRevAndLastClientUpdate(
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  uploadAppData(
    data: AppDataComplete,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error>;

  downloadAppData(
    localRev: string | null,
  ): Promise<{ rev: string; data: AppDataComplete | undefined }>;
}
