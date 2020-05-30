import {Injectable} from '@angular/core';
import {GlobalConfigService} from '../config/global-config.service';
import {Observable} from 'rxjs';
import {DropboxSyncConfig} from '../config/global-config.model';
import {map, mapTo, take} from 'rxjs/operators';
import {DropboxApiService} from './dropbox-api.service';
import {DROPBOX_SYNC_FILE_NAME} from './dropbox.const';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {GlobalSyncService} from '../../core/global-sync/global-sync.service';
import * as moment from 'moment';
import {isoDateWithoutMs, toDropboxIsoString} from './iso-date-without-ms.util.';

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

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _globalSyncService: GlobalSyncService,
    private _dropboxApiService: DropboxApiService,
  ) {
    console.log(moment(Date.now()).toDate().toString());
    console.log(moment(Date.now()).toDate());
    console.log(moment(Date.now()).toISOString());
    console.log('--------------------');
    console.log('2015-05-12T15:50:38Z');
    this.F = 'YYYY-MM-DDTHH:mm:SSZ';
    console.log(moment(Date.now()).format(this.F));
    console.log(isoDateWithoutMs(Date.now()));
    console.log(new Date().toISOString().split('.')[0] + 'Z');


    // this.sync();
  }

  async sync() {
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
      // client_modified: toDropboxIsoString(data.lastLocalSyncModelChange),
    });
  }

  private _importData() {
  }
}
