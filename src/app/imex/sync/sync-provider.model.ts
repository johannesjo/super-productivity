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

  log(...args: any | any[]): void;

  getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number } | null>;

  // upload & download & import
  // TODO params to object
  uploadAppData(data: AppDataComplete, localRev: string | null, isForceOverwrite?: boolean): Promise<string | null>;

  downloadAppData(localRev: string | null): Promise<{ rev: string, data: AppDataComplete | undefined }>;

  // importAppData(data: AppDataComplete, rev: string): Promise<unknown>;
}
