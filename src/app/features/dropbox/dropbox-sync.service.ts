import {Injectable} from '@angular/core';
import {GlobalConfigService} from '../config/global-config.service';
import {combineLatest, Observable} from 'rxjs';
import {DropboxSyncConfig} from '../config/global-config.model';
import {concatMap, first, map, mapTo, take, tap} from 'rxjs/operators';
import {DropboxApiService} from './dropbox-api.service';
import {DROPBOX_SYNC_FILE_PATH} from './dropbox.const';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {DataInitService} from '../../core/data-init/data-init.service';
import {LS_DROPBOX_LAST_LOCAL_REVISION} from '../../core/persistence/ls-keys.const';
import {DropboxFileMetadata} from './dropbox.model';

@Injectable({
  providedIn: 'root'
})
export class DropboxSyncService {
  dropboxCfg$: Observable<DropboxSyncConfig> = this._globalConfigService.cfg$.pipe(
    map(cfg => cfg.dropboxSync)
  );
  isEnabled$: Observable<boolean> = this.dropboxCfg$.pipe(
    map(cfg => cfg && cfg.isEnabled),
  );
  syncInterval$: Observable<number> = this.dropboxCfg$.pipe(
    map(cfg => cfg && cfg.syncInterval),
    // TODO remove
    mapTo(10000),
  );

  F: any;

  private _isReady$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => combineLatest([
      this.isEnabled$,
      this._dropboxApiService.isReady$,
    ]).pipe(
      map((isEnabled, isReady) => isEnabled && isReady),
      tap((isReady) => !isReady && new Error('Dropbox Sync not ready')),
      first(),
    )),
  );

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _globalSyncService: GlobalSyncService,
    private _dropboxApiService: DropboxApiService,
    private _dataInitService: DataInitService,
  ) {
    this.F = 'YYYY-MM-DDTHH:mm:SSZ';

    this.sync();
  }

  async sync() {
    await this._isReady$.toPromise();
    // try {
    //   const r = await this._loadData();
    //   console.log(r);
    // } catch (e) {
    //   console.error(e);
    // }
    console.log(await this._getRevAndLastClientUpdate());


    return;
    const d = await this._globalSyncService.inMemory$.pipe(take(1)).toPromise();
    console.log(d);

    const r2 = await this._uploadAppData(d);
    console.log(r2);

  }

  private _importData() {
    // TODO also update rev!
  }

  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  private async _getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number }> {
    const r = await this._dropboxApiService.getMetaData(DROPBOX_SYNC_FILE_PATH);
    const d = new Date(r.client_modified);
    return {
      clientUpdate: d.getTime(),
      rev: r.rev,
    };
  }

  private _downloadAppData(): Promise<{ meta: DropboxFileMetadata, data: AppDataComplete }> {
    return this._dropboxApiService.download<AppDataComplete>({
      path: DROPBOX_SYNC_FILE_PATH,
      localRev: this._getLastLocalRev(),
    });
  }

  private async _uploadAppData(data: AppDataComplete): Promise<DropboxFileMetadata> {
    const r = await this._dropboxApiService.upload({
      path: DROPBOX_SYNC_FILE_PATH,
      data,
      clientModified: data.lastLocalSyncModelChange,
    });
    this._updateRev(r.rev);
    return r;
  }

  private _getLastLocalRev(): string {
    return localStorage.getItem(LS_DROPBOX_LAST_LOCAL_REVISION);
  }

  private _updateRev(rev: string) {
    return localStorage.setItem(LS_DROPBOX_LAST_LOCAL_REVISION, rev);
  }
}
