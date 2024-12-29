import { Injectable, inject } from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { interval, Observable } from 'rxjs';
import { LocalBackupConfig } from '../../features/config/global-config.model';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { LocalBackupMeta } from './local-backup.model';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { IS_ELECTRON } from '../../app.constants';
import { androidInterface } from '../../features/android/android-interface';

const DEFAULT_BACKUP_INTERVAL = 2 * 60 * 1000;
const ANDROID_DB_KEY = 'backup';

// const DEFAULT_BACKUP_INTERVAL = 6 * 1000;

@Injectable()
export class LocalBackupService {
  private _configService = inject(GlobalConfigService);
  private _persistenceService = inject(PersistenceService);

  private _cfg$: Observable<LocalBackupConfig> = this._configService.cfg$.pipe(
    map((cfg) => cfg.localBackup),
  );
  private _triggerBackupSave$: Observable<unknown> = this._cfg$.pipe(
    filter((cfg) => cfg.isEnabled),
    switchMap(() => interval(DEFAULT_BACKUP_INTERVAL)),
    tap(() => this._backup()),
  );

  init(): void {
    this._triggerBackupSave$.subscribe();
  }

  checkBackupAvailable(): Promise<boolean | LocalBackupMeta> {
    return IS_ANDROID_WEB_VIEW
      ? androidInterface.loadFromDbWrapped(ANDROID_DB_KEY).then((r) => !!r)
      : window.ea.checkBackupAvailable();
  }

  loadBackupElectron(backupPath: string): Promise<string> {
    return window.ea.loadBackupData(backupPath) as Promise<string>;
  }

  loadBackupAndroid(): Promise<string> {
    return androidInterface.loadFromDbWrapped(ANDROID_DB_KEY).then((r) => r as string);
  }

  private async _backup(): Promise<void> {
    const data = await this._persistenceService.loadComplete();
    if (IS_ELECTRON) {
      window.ea.backupAppData(data);
    }
    if (IS_ANDROID_WEB_VIEW) {
      androidInterface.saveToDbWrapped(ANDROID_DB_KEY, JSON.stringify(data));
    }
  }
}
