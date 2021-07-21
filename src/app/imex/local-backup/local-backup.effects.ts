import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { take, tap } from 'rxjs/operators';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../sync/sync.model';
import { IS_ELECTRON } from '../../app.constants';
import { LocalBackupService } from './local-backup.service';
import { DataImportService } from '../sync/data-import.service';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import * as moment from 'moment';
import { IS_ANDROID_BACKUP_READY } from '../../core/android/android-interface';

@Injectable()
export class LocalBackupEffects {
  checkForBackupIfNoTasks$: any =
    (IS_ELECTRON || IS_ANDROID_BACKUP_READY) &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(loadAllData),
          take(1),
          tap(({ appDataComplete }) => {
            this._checkForBackupIfEmpty(appDataComplete);
          }),
        ),
      { dispatch: false },
    );

  constructor(
    private _actions$: Actions,
    private _localBackupService: LocalBackupService,
    private _dataImportService: DataImportService,
    private _translateService: TranslateService,
  ) {}

  private async _checkForBackupIfEmpty(appDataComplete: AppDataComplete): Promise<void> {
    if (
      appDataComplete.task.ids.length === 0 &&
      appDataComplete.taskArchive.ids.length === 0 &&
      !appDataComplete.lastLocalSyncModelChange
    ) {
      const backupMeta = await this._localBackupService.isBackupAvailable();
      if (typeof backupMeta !== 'boolean') {
        if (
          confirm(
            this._translateService.instant(T.CONFIRM.RESTORE_FILE_BACKUP, {
              dir: backupMeta.folder,
              from: this._formatDate(backupMeta.created),
            }),
          )
        ) {
          const backupData = await this._localBackupService.loadBackup(backupMeta.path);
          console.log('backupData', backupData);
          await this._dataImportService.importCompleteSyncData(JSON.parse(backupData));
        }
      }
    }
  }

  private _formatDate(date: Date | string | number): string {
    return moment(date).format('DD-MM-YYYY, hh:mm:ss');
  }
}
