import { inject, Injectable } from '@angular/core';
import { AppDataComplete } from './sync.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { SnackService } from '../../core/snack/snack.service';
import { ReminderService } from '../../features/reminder/reminder.service';
import { ImexMetaService } from '../imex-meta/imex-meta.service';
import { T } from '../../t.const';
import { DataInitService } from '../../core/data-init/data-init.service';
import { isValidAppData } from './is-valid-app-data.util';
import { DataRepairService } from '../../core/data-repair/data-repair.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { TranslateService } from '@ngx-translate/core';
import { GLOBAL_CONFIG_LOCAL_ONLY_FIELDS } from './sync.const';
import { get, set } from 'object-path';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root',
})
export class DataImportService {
  private _persistenceService = inject(PersistenceService);
  private _snackService = inject(SnackService);
  private _reminderService = inject(ReminderService);
  private _imexMetaService = inject(ImexMetaService);
  private _dataInitService = inject(DataInitService);
  private _dataRepairService = inject(DataRepairService);
  private _translateService = inject(TranslateService);

  constructor() {
    this._isCheckForStrayLocalDBBackupAndImport();
  }

  async getCompleteSyncData(): Promise<AppDataComplete> {
    return await this._persistenceService.loadComplete();
  }

  async importCompleteSyncData(
    data: AppDataComplete,
    {
      isBackupReload = false,
      isSkipStrayBackupCheck = false,
      isOmitLocalFields = false,
    }: {
      isBackupReload?: boolean;
      isSkipStrayBackupCheck?: boolean;
      isOmitLocalFields?: boolean;
    } = {
      isBackupReload: false,
      isSkipStrayBackupCheck: false,
      isOmitLocalFields: false,
    },
  ): Promise<void> {
    this._snackService.open({ msg: T.F.SYNC.S.IMPORTING, ico: 'cloud_download' });
    this._imexMetaService.setDataImportInProgress(true);

    // get rid of outdated project data
    if (!isBackupReload) {
      if (
        !isSkipStrayBackupCheck &&
        (await this._isCheckForStrayLocalDBBackupAndImport())
      ) {
        return;
      }
      await this._persistenceService.saveBackup();
    }

    if (isValidAppData(data)) {
      console.log('isValidAppData', true, data);
      try {
        const mergedData = isOmitLocalFields
          ? await this._mergeWithLocalOmittedFields(data)
          : data;

        // clear database to have a clean one and delete legacy stuff
        await this._persistenceService.clearDatabaseExceptBackupAndLocalOnlyModel();

        // save data to database first then load to store from there
        await this._persistenceService.importComplete(mergedData);
        await this._loadAllFromDatabaseToStore();
        await this._persistenceService.clearBackup();
        this._imexMetaService.setDataImportInProgress(false);
        this._snackService.open({ type: 'SUCCESS', msg: T.F.SYNC.S.SUCCESS_IMPORT });
      } catch (e) {
        console.error(e);
        await this._importLocalDBBackup();
        // NOTE: needs to come after otherwise the snack will never show, due to the success snack of the import
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.ERROR_FALLBACK_TO_BACKUP,
        });
        this._imexMetaService.setDataImportInProgress(false);
      }
    } else if (this._dataRepairService.isRepairPossibleAndConfirmed(data)) {
      const fixedData = this._dataRepairService.repairData(data);
      await this.importCompleteSyncData(fixedData, {
        isBackupReload,
        isSkipStrayBackupCheck: true,
      });
    } else {
      console.log('isValidAppData', false, data);
      this._snackService.open({ type: 'ERROR', msg: T.F.SYNC.S.ERROR_INVALID_DATA });
      console.error(data);
      this._imexMetaService.setDataImportInProgress(false);
    }
  }

  private async _mergeWithLocalOmittedFields(
    newData: AppDataComplete,
  ): Promise<AppDataComplete> {
    const oldLocalData: AppDataComplete =
      await this._persistenceService.loadComplete(true);
    const mergedData = { ...newData };
    GLOBAL_CONFIG_LOCAL_ONLY_FIELDS.forEach((op) => {
      const oldLocalValue = get(oldLocalData.globalConfig, op);
      // console.log({ oldLocalValue, op });

      if (oldLocalValue) {
        set(mergedData.globalConfig, op, oldLocalValue);
      }
    });
    return mergedData;
  }

  private async _loadAllFromDatabaseToStore(): Promise<any> {
    return await Promise.all([
      // reload view model from ls
      this._dataInitService.reInit(true),
      this._reminderService.reloadFromDatabase(),
    ]);
  }

  private async _importLocalDBBackup(): Promise<any> {
    const data = await this._persistenceService.loadBackup();
    return this.importCompleteSyncData(data, { isBackupReload: true });
  }

  private async _isCheckForStrayLocalDBBackupAndImport(): Promise<boolean> {
    const backup = await this._persistenceService.loadBackup();
    if (!localStorage.getItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP)) {
      if (backup) {
        await this._persistenceService.clearBackup();
      }
      localStorage.setItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP, 'true');
    }

    if (backup) {
      if (confirm(this._translateService.instant(T.CONFIRM.RESTORE_STRAY_BACKUP))) {
        await this._importLocalDBBackup();
        return true;
      } else {
        if (confirm(this._translateService.instant(T.CONFIRM.DELETE_STRAY_BACKUP))) {
          await this._persistenceService.clearBackup();
        }
      }
    }
    return false;
  }
}
