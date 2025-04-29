import { inject, Injectable } from '@angular/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { interval, Observable } from 'rxjs';
import { LocalBackupConfig } from '../../features/config/global-config.model';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { LocalBackupMeta } from './local-backup.model';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { IS_ELECTRON } from '../../app.constants';
import { androidInterface } from '../../features/android/android-interface';
import { PfapiService } from '../../pfapi/pfapi.service';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';
import { SnackService } from '../../core/snack/snack.service';

const DEFAULT_BACKUP_INTERVAL = 5 * 60 * 1000;
const ANDROID_DB_KEY = 'backup';

// const DEFAULT_BACKUP_INTERVAL = 6 * 1000;

@Injectable({
  providedIn: 'root',
})
export class LocalBackupService {
  private _configService = inject(GlobalConfigService);
  private _pfapiService = inject(PfapiService);
  private _snackService = inject(SnackService);
  private _translateService = inject(TranslateService);

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

  async askForFileStoreBackupIfAvailable(): Promise<void> {
    if (!IS_ELECTRON || !IS_ANDROID_WEB_VIEW) {
      return;
    }

    const backupMeta = await this.checkBackupAvailable();
    // ELECTRON
    // --------
    if (IS_ELECTRON && typeof backupMeta !== 'boolean') {
      if (
        confirm(
          this._translateService.instant(T.CONFIRM.RESTORE_FILE_BACKUP, {
            dir: backupMeta.folder,
            from: new Date(backupMeta.created).toLocaleString(),
          }),
        )
      ) {
        const backupData = await this.loadBackupElectron(backupMeta.path);
        console.log('backupData', backupData);
        await this._importBackup(backupData);
      }

      // ANDROID
      // -------
    } else if (IS_ANDROID_WEB_VIEW && backupMeta === true) {
      if (
        confirm(this._translateService.instant(T.CONFIRM.RESTORE_FILE_BACKUP_ANDROID))
      ) {
        const backupData = await this.loadBackupAndroid();
        console.log('backupData', backupData);
        const lineBreaksReplaced = backupData.replace(/\n/g, '\\n');
        console.log('lineBreaksReplaced', lineBreaksReplaced);
        await this._importBackup(lineBreaksReplaced);
      }
    }
  }

  private async _backup(): Promise<void> {
    const data = await this._pfapiService.pf.getAllSyncModelData();
    if (IS_ELECTRON) {
      window.ea.backupAppData(data);
    }
    if (IS_ANDROID_WEB_VIEW) {
      await androidInterface.saveToDbWrapped(ANDROID_DB_KEY, JSON.stringify(data));
    }
  }

  private async _importBackup(backupData: string): Promise<void> {
    try {
      await this._pfapiService.importCompleteBackup(
        JSON.parse(backupData) as AppDataCompleteNew,
      );
    } catch (e) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.FILE_IMEX.S_ERR_IMPORT_FAILED,
      });
      return;
    }
  }
}
