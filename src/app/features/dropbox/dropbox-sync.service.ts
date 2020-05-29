import {Injectable} from '@angular/core';
import {GlobalConfigService} from '../config/global-config.service';
import {Observable} from 'rxjs';
import {DropboxSyncConfig} from '../config/global-config.model';
import {map, mapTo} from 'rxjs/operators';

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


  constructor(
    private _globalConfigService: GlobalConfigService,
  ) {
  }
}
