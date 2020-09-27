import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { DropboxSyncService } from '../../features/dropbox/dropbox-sync.service';
import { SyncProviderServiceInterface } from './sync-provider.model';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  currentProvider$: ReplaySubject<SyncProviderServiceInterface> = new ReplaySubject(1);

  constructor(private _dropboxSyncService: DropboxSyncService) {
    this.currentProvider$.next(this._dropboxSyncService);
  }
}
