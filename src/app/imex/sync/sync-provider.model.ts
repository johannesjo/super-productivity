import { Observable } from 'rxjs';
import { DropboxFileMetadata } from '../../features/dropbox/dropbox.model';
import { AppDataComplete } from './sync.model';
import { GoogleDriveFileMeta } from '../../features/google/google-api.model';

export enum SyncProvider {
  'GoogleDrive' = 'GoogleDrive',
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
}

// TODO unify meta
// export interface SyncFileMeta {
// }

export type SyncFileMeta = DropboxFileMetadata | GoogleDriveFileMeta;

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isReady$: Observable<boolean>;
  isReadyForRequests$: Observable<boolean>;

  isAdditionalPreChecksPassed(args: any): Promise<boolean>;

  log(...args: any|any[]): void;

  // revs
  updateLocalLastSyncCheck(): void;

  setLocalLastSync(lastSync: number): void;

  getLocalLastSync(): number;

  getLocalRev(): string | null;

  setLocalRev(rev: string): void;

  getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number }>;

  // upload & download & import
  uploadAppData(data: AppDataComplete, isForceOverwrite?: boolean): Promise<unknown>;

  downloadAppData(): Promise<{ rev: string, data: AppDataComplete | undefined }>;

  importAppData(data: AppDataComplete, rev: string): Promise<unknown>;
}
