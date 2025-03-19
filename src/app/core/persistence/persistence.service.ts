import { inject, Injectable } from '@angular/core';
import { AllowedDBKeys } from './storage-keys.const';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { Subject } from 'rxjs';
import { devError } from '../../util/dev-error';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import { PfapiService } from '../../pfapi/pfapi.service';

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PersistenceService {
  pfapi = inject(PfapiService);
  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isSyncModelChange: boolean;
    projectId?: string;
  }> = new Subject();

  private _isBlockSaving: boolean = false;
  private _invalidDataCount = 0;

  async getValidCompleteData(): Promise<AppDataComplete> {
    const d = await this.loadComplete();
    // if we are very unlucky (e.g. a task has updated but not the related tag changes) app data might not be valid. we never want to sync that! :)
    if (isValidAppData(d)) {
      this._invalidDataCount = 0;
      return d;
    } else {
      // TODO remove as this is not a real error, and this is just a test to check if this ever occurs
      devError('Invalid data => RETRY getValidCompleteData');
      this._invalidDataCount++;
      if (this._invalidDataCount > MAX_INVALID_DATA_ATTEMPTS) {
        throw new Error('Unable to get valid app data');
      }
      return this.getValidCompleteData();
    }
  }

  // TODO
  // BACKUP AND SYNC RELATED
  // -----------------------
  async loadBackup(): Promise<AppDataComplete> {
    throw new Error('Method not implemented.');
    // return this._loadFromDb({ dbKey: DB.BACKUP });
  }

  async saveBackup(backup?: AppDataComplete): Promise<unknown> {
    // const data: AppDataComplete = backup || (await this.loadComplete());
    throw new Error('Method not implemented.');
    // return this._saveToDb({
    //   dbKey: DB.BACKUP,
    //   data,
    //   isDataImport: true,
    //   isSyncModelChange: true,
    // });
  }

  async clearBackup(): Promise<unknown> {
    throw new Error('Method not implemented.');
    // return this._removeFromDb({ dbKey: DB.BACKUP });
  }

  // NOTE: not including backup
  // async loadCompleteWithPrivate(): Promise<AppDataComplete> {
  // }

  async loadComplete(isMigrate = false): Promise<AppDataComplete> {
    // TODO
    return this.pfapi.pf.getCompleteData() as any;
  }

  async importComplete(data: AppDataComplete): Promise<unknown> {
    throw new Error('Method not implemented.');
    return this.pfapi.pf.getCompleteData() as any;
    // console.log('IMPORT--->', data);
    // this._isBlockSaving = true;
    //
    // const forBase = Promise.all(
    //   this._baseModels.map(async (modelCfg: PersistenceBaseModel<any>) => {
    //     return await modelCfg.saveState(data[modelCfg.appDataKey], {
    //       isDataImport: true,
    //     });
    //   }),
    // );
    //
    // return await Promise.all([forBase])
    //   .then(() => {
    //     if (typeof data.lastLocalSyncModelChange !== 'number') {
    //       // not necessarily a critical error as there might be other reasons for this error to popup
    //       devError('No lastLocalSyncModelChange for imported data');
    //       data.lastLocalSyncModelChange = Date.now();
    //     }
    //
    //     return Promise.all([
    //       this._persistenceLocalService.updateLastSyncModelChange(
    //         data.lastLocalSyncModelChange,
    //       ),
    //       this._persistenceLocalService.updateLastArchiveChange(
    //         data.lastArchiveUpdate || 0,
    //       ),
    //     ]);
    //   })
    //   .finally(() => {
    //     this._isBlockSaving = false;
    //   });
  }

  async clearDatabaseExceptBackupAndLocalOnlyModel(): Promise<void> {
    throw new Error('Method not implemented.');
    // const backup: AppDataComplete = await this.loadBackup();
    // const localOnlyModel = await this._persistenceLocalService.load();
    // await this._databaseService.clearDatabase();
    // await this._persistenceLocalService.save(localOnlyModel);
    // if (backup) {
    //   await this.saveBackup(backup);
    // }
  }

  // DATA STORAGE INTERFACE
  // ---------------------
}
