import { Observable } from 'rxjs';

export enum SyncProvider {
  'GoogleDrive' = 'GoogleDrive',
  'Dropbox' = 'Dropbox',
  'WebDAV' = 'WebDAV',
}

export interface SyncProviderServiceInterface {
  id: SyncProvider;
  isReady$: Observable<boolean>;

  sync(): Promise<unknown>;
}
