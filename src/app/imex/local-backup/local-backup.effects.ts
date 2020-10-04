import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { take, tap } from 'rxjs/operators';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../sync/sync.model';
import { IS_ELECTRON } from '../../app.constants';
import { LocalBackupService } from './local-backup.service';
import { DataImportService } from '../sync/data-import.service';

@Injectable()
export class LocalBackupEffects {

  checkForBackupIfNoTasks$: any = createEffect(() => this._actions$.pipe(
    ofType(
      loadAllData
    ),
    take(1),
    tap(({appDataComplete}) => {
      console.log(appDataComplete);
      this._checkForBackupIfEmpty(appDataComplete);
    })
  ), {dispatch: false});

  constructor(
    private _actions$: Actions,
    private _localBackupService: LocalBackupService,
    private _dataImportService: DataImportService,
  ) {
  }

  private async _checkForBackupIfEmpty(appDataComplete: AppDataComplete) {
    console.log(IS_ELECTRON, appDataComplete);
    if (IS_ELECTRON) {
      if (appDataComplete.task.ids.length === 0 && appDataComplete.taskArchive.ids.length === 0) {
        const backupMeta = await this._localBackupService.isBackupAvailable();
        if (backupMeta) {
          console.log('backupMeta', backupMeta);
          if (confirm('NO TASK DATA IMPORT BACKUP FROM?' + backupMeta.path)) {
            const backupData = await this._localBackupService.loadBackup(backupMeta.path);
            console.log('backupData', backupData);
            await this._dataImportService.importCompleteSyncData(JSON.parse(backupData));
          }
        }
      }
    }
  }
}
