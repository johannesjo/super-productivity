import { Observable } from 'rxjs';
import { AppMainFileData, SyncGetRevResult } from './sync.model';

// NOTE: do not change!!
export enum SyncProvider {
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
  'LocalFile' = 'LocalFile',
}

export type SyncTarget = 'MAIN' | 'ARCHIVE';

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean>;

  getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error>;

  downloadFileData(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: AppMainFileData | string | undefined }>;

  // TODO also add functions for archive

  // TODO also add legacy data functions
  // getRevAndLastClientUpdate(
  //   localRev: string | null,
  // ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;
  //
  // uploadAppData(
  //   dataStr: string,
  //   clientModified: number,
  //   localRev: string | null,
  //   isForceOverwrite?: boolean,
  // ): Promise<string | Error>;
  //
  // downloadAppData(
  //   localRev: string | null,
  // ): Promise<{ rev: string; dataStr: AppDataComplete | string | undefined }>;
}
