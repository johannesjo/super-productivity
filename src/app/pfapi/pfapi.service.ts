import { Injectable } from '@angular/core';
import { ModelCfgToModelCtrl, Pfapi } from './api';
import { Subject } from 'rxjs';
import { AllowedDBKeys, DB } from '../core/persistence/storage-keys.const';
import { isValidAppData } from '../imex/sync/is-valid-app-data.util';
import { devError } from '../util/dev-error';
import {
  AppDataCompleteNew,
  PFAPI_CFG,
  PFAPI_MODEL_CFGS,
  PFAPI_SYNC_PROVIDERS,
  PfapiAllModelCfg,
} from './pfapi-config';

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  public readonly pf = new Pfapi(PFAPI_MODEL_CFGS, PFAPI_SYNC_PROVIDERS, PFAPI_CFG);
  public readonly m: ModelCfgToModelCtrl<PfapiAllModelCfg> = this.pf.m;

  // TODO replace with pfapi event
  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isSyncModelChange: boolean;
    projectId?: string;
  }> = new Subject();

  private _invalidDataCount = 0;

  getAllSyncModelData = this.pf.getAllSyncModelData.bind(this.pf);
  importAllSycModelData = this.pf.importAllSycModelData.bind(this.pf);
  isValidateComplete = this.pf.isValidateComplete.bind(this.pf);
  repairCompleteData = this.pf.repairCompleteData.bind(this.pf);

  async getValidCompleteData(): Promise<AppDataCompleteNew> {
    const d = (await this.getAllSyncModelData()) as AppDataCompleteNew;
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

  // BACKUP AND SYNC RELATED
  // -----------------------
  async loadBackup(): Promise<AppDataCompleteNew> {
    return (await this.pf.db.load(DB.BACKUP)) as any;
  }

  async saveBackup(backup?: AppDataCompleteNew): Promise<unknown> {
    return (await this.pf.db.save(DB.BACKUP, backup)) as any;
  }

  async clearBackup(): Promise<unknown> {
    return (await this.pf.db.remove(DB.BACKUP)) as any;
  }

  async clearDatabaseExceptBackupAndLocalOnlyModel(): Promise<void> {
    const backup: AppDataCompleteNew = await this.loadBackup();
    await this.pf.clearDatabaseExceptLocalOnly();
    if (backup) {
      await this.saveBackup(backup);
    }
  }
}
