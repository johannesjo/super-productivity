import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DropboxSyncService } from '../../features/dropbox/dropbox-sync.service';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  isEnabledAndReady$: Observable<boolean> = this._dropboxSyncService.isEnabledAndReady$;
  syncInterval$: Observable<number> = this._dropboxSyncService.syncInterval$;

  constructor(private _dropboxSyncService: DropboxSyncService) {
  }

  sync(): Promise<unknown> {
    return this._dropboxSyncService.sync();
  }
}
