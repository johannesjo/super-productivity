import { Observable } from 'rxjs';
import { AppDataComplete, SyncGetRevResult } from './sync.model';

// NOTE: do not change!!
export enum SyncProvider {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
}

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean>;

  getRevAndLastClientUpdate(
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  uploadAppData(
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error>;

  downloadAppData(
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: AppDataComplete | string | undefined }>;
}
