import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { DropboxSyncService } from '../../features/dropbox/dropbox-sync.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import { GoogleDriveSyncService } from '../../features/google/google-drive-sync.service';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(map(cfg => cfg?.sync));
  currentProvider$: Observable<SyncProviderServiceInterface> = this.syncCfg$.pipe(
    map((cfg: SyncConfig): SyncProviderServiceInterface | null => {
      console.log(cfg.syncProvider);
      switch (cfg.syncProvider) {
        case SyncProvider.Dropbox:
          return this._dropboxSyncService;
        case SyncProvider.GoogleDrive:
          return this._googleDriveSyncService;
        default:
          return null;
      }
    }),
    filter(p => !!p),
    map((v) => v as SyncProviderServiceInterface),
  );
  syncInterval$: Observable<number> = this.syncCfg$.pipe(map(cfg => cfg.syncInterval));
  isEnabled$: Observable<boolean> = this.syncCfg$.pipe(map(cfg => cfg.isEnabled));
  isEnabledAndReady$: Observable<boolean> = combineLatest([
    this.currentProvider$.pipe(
      switchMap(currentProvider => currentProvider.isReady$),
    ),
    this.syncCfg$.pipe(map(cfg => cfg.isEnabled)),
  ]).pipe(
    map(([isReady, isEnabled]) => isReady && isEnabled),
  );

  constructor(
    private _dropboxSyncService: DropboxSyncService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _globalConfigService: GlobalConfigService,
  ) {
  }

  async sync(): Promise<unknown> {
    const currentProvider = await this.currentProvider$.pipe(take(1)).toPromise();
    if (!currentProvider) {
      throw new Error('No Sync Provider for sync()');
    }
    return currentProvider.sync();
  }

}
