import { Injectable } from '@angular/core';
import { AppDataComplete } from './sync.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { SnackService } from '../../core/snack/snack.service';
import { ReminderService } from '../../features/reminder/reminder.service';
import { ImexMetaService } from '../imex-meta/imex-meta.service';
import { T } from '../../t.const';
import { MigrationService } from '../../core/migration/migration.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { isValidAppData } from './is-valid-app-data.util';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root',
})
export class DataImportService {

  constructor(
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _reminderService: ReminderService,
    private _imexMetaService: ImexMetaService,
    private _migrationService: MigrationService,
    private _dataInitService: DataInitService,
  ) {
  }

  async getCompleteSyncData(): Promise<AppDataComplete> {
    return await this._persistenceService.loadComplete();
  }

  async importCompleteSyncData(data: AppDataComplete, isBackupReload: boolean = false) {
    this._snackService.open({msg: T.S.SYNC.IMPORTING, ico: 'cloud_download'});
    this._imexMetaService.setDataImportInProgress(true);

    // get rid of outdated project data
    if (!isBackupReload) {
      await this._persistenceService.saveBackup();
      await this._persistenceService.clearDatabaseExceptBackup();
    }

    if (isValidAppData(data)) {
      try {
        const migratedData = this._migrationService.migrateIfNecessary(data);
        // save data to database first then load to store from there
        await this._persistenceService.importComplete(migratedData);
        await this._loadAllFromDatabaseToStore();
        this._imexMetaService.setDataImportInProgress(false);
        this._snackService.open({type: 'SUCCESS', msg: T.S.SYNC.SUCCESS});

      } catch (e) {
        this._snackService.open({
          type: 'ERROR',
          msg: T.S.SYNC.ERROR_FALLBACK_TO_BACKUP,
        });
        console.error(e);
        await this._loadBackup();
        this._imexMetaService.setDataImportInProgress(false);
      }
    } else {
      this._snackService.open({type: 'ERROR', msg: T.S.SYNC.ERROR_INVALID_DATA});
      console.error(data);
      this._imexMetaService.setDataImportInProgress(false);
    }
  }

  private async _loadAllFromDatabaseToStore(): Promise<any> {
    return await Promise.all([
      // reload view model from ls
      this._dataInitService.reInit(true),
      this._reminderService.reloadFromDatabase(),
    ]);
  }

  private async _loadBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.importCompleteSyncData(data, true);
  }
}
