import { Injectable } from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { interval, Observable } from 'rxjs';
import { LocalBackupConfig } from '../../features/config/global-config.model';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { DataImportService } from '../sync/data-import.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { ElectronService } from '../../core/electron/electron.service';
import { ipcRenderer } from 'electron';

const DEFAULT_BACKUP_INTERVAL = 2 * 60 * 1000;

// const DEFAULT_BACKUP_INTERVAL = 6 * 1000;

@Injectable()
export class LocalBackupService {
  private _cfg$: Observable<LocalBackupConfig> = this._configService.cfg$.pipe(map(cfg => cfg.localBackup));
  private _triggerBackups: Observable<unknown> = this._cfg$.pipe(
    filter(cfg => cfg.isEnabled),
    switchMap(() => interval(DEFAULT_BACKUP_INTERVAL)),
    tap(() => this._backup())
  );

  constructor(
    private _configService: GlobalConfigService,
    private _dataImportService: DataImportService,
    private _electronService: ElectronService,
  ) {
  }

  init() {
    this._triggerBackups.subscribe();
  }

  private async _backup() {
    const data = await this._dataImportService.getCompleteSyncData();
    (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.BACKUP, data);
  }
}
