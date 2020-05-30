import {Injectable} from '@angular/core';
import {GlobalConfigService} from '../config/global-config.service';
import {combineLatest, Observable} from 'rxjs';
import {DropboxSyncConfig} from '../config/global-config.model';
import {concatMap, first, map, mapTo, take, tap} from 'rxjs/operators';
import {DropboxApiService} from './dropbox-api.service';
import {DROPBOX_SYNC_FILE_NAME} from './dropbox.const';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import {DataInitService} from '../../core/data-init/data-init.service';
import {toDropboxIsoString} from './iso-date-without-ms.util.';

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
    console.log('SYNC');
    await this._isReady$.toPromise();
    console.log('SYNC_AFTER_READY');

    const r = await this._loadData();
    console.log(r);

    const d = await this._globalSyncService.inMemory$.pipe(take(1)).toPromise();
    console.log(d);

    const r2 = this._uploadData(d);
    console.log(r2);

  }

  private _loadData(): Promise<DropboxTypes.files.FileMetadata> {
    return this._dropboxApiService.loadFile({
      path: '/' + DROPBOX_SYNC_FILE_NAME,
    });
  }

  private _uploadData(data: AppDataComplete): Promise<DropboxTypes.files.FileMetadata> {
    return this._dropboxApiService.uploadFile({
      path: '/' + DROPBOX_SYNC_FILE_NAME,
      contents: JSON.stringify(data),
      // we need to use ISO 8601 "combined date and time representation" format:
      client_modified: toDropboxIsoString(data.lastLocalSyncModelChange),
    });
  }

  private _importData() {
  }
}
