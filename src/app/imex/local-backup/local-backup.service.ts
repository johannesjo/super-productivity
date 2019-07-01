import {Injectable} from '@angular/core';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {interval, Observable} from 'rxjs';
import {LocalBackupConfig} from '../../features/config/global-config.model';
import {filter, map, switchMap, tap} from 'rxjs/operators';
import {SyncService} from '../sync/sync.service';
import {ElectronService} from 'ngx-electron';
import {IPC_BACKUP} from '../../../../electron/ipc-events.const';

const DEFAULT_BACKUP_INTERVAL = 2 * 60 * 1000;

// const DEFAULT_BACKUP_INTERVAL = 6 * 1000;

@Injectable()
export class LocalBackupService {
  private _cfg$: Observable<LocalBackupConfig> = this._configService.cfg$.pipe(map(cfg => cfg.localBackup));
  private _triggerBackups = this._cfg$.pipe(
    filter(cfg => cfg.isEnabled),
    switchMap(() => interval(DEFAULT_BACKUP_INTERVAL)),
    tap(() => this._backup())
  );

  constructor(
    private _configService: GlobalConfigService,
    private _syncService: SyncService,
    private _electronService: ElectronService,
  ) {
  }

  init() {
    this._triggerBackups.subscribe();
  }

  private async _backup() {
    const data = await this._syncService.getCompleteSyncData();
    this._electronService.ipcRenderer.send(IPC_BACKUP, data);
  }
}
