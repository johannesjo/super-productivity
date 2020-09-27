import { Observable } from 'rxjs';

export enum SyncProvider {
  'GoogleDrive' = 'GoogleDrive',
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
}

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isEnabledAndReady$: Observable<boolean>;
  syncInterval$: Observable<number>;

  sync(): Promise<unknown>;
}
