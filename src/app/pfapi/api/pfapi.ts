import {
  AllSyncModels,
  CompleteBackup,
  ConflictData,
  EncryptAndCompressCfg,
  ExtractModelCfgType,
  ModelBase,
  ModelCfgs,
  ModelCfgToModelCtrl,
  PfapiBaseCfg,
  PrivateCfgByProviderId,
} from './pfapi.model';
import { SyncService } from './sync/sync.service';
import { Database } from './db/database';
import { IndexedDbAdapter } from './db/indexed-db-adapter';
import { MetaModelCtrl } from './model-ctrl/meta-model-ctrl';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { MiniObservable } from './util/mini-observable';
import { SyncProviderServiceInterface } from './sync/sync-provider.interface';
import { pfLog } from './util/log';
import { SyncProviderId, SyncStatus } from './pfapi.const';
import { EncryptAndCompressHandlerService } from './sync/encrypt-and-compress-handler.service';
import { SyncProviderPrivateCfgStore } from './sync/sync-provider-private-cfg-store';
import {
  BackupImportFailedError,
  DataValidationFailedError,
  InvalidModelCfgError,
  InvalidSyncProviderError,
  ModelIdWithoutCtrlError,
  NoRepairFunctionProvidedError,
  NoValidateFunctionProvidedError,
} from './errors/errors';
import { TmpBackupService } from './backup/tmp-backup.service';
import { promiseTimeout } from '../../util/promise-timeout';
import { PFEventEmitter } from './util/events';

// export class <PCfg extends Cfg, Ms extends ModelCfg<any>[]> {
export class Pfapi<const MD extends ModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _syncService: SyncService<MD>;
  private readonly _activeSyncProvider$ =
    new MiniObservable<SyncProviderServiceInterface<unknown> | null>(null);
  private readonly _encryptAndCompressCfg$ = new MiniObservable<EncryptAndCompressCfg>({
    isCompress: false,
    isEncrypt: false,
    encryptKey: undefined,
  });

  public readonly tmpBackupService: TmpBackupService<AllSyncModels<MD>>;
  public readonly db: Database;
  public readonly metaModel: MetaModelCtrl;
  public readonly m: ModelCfgToModelCtrl<MD>;
  public readonly ev = new PFEventEmitter();

  constructor(
    modelCfgs: MD,
    public syncProviders: SyncProviderServiceInterface<unknown>[],
    public cfg?: PfapiBaseCfg<MD>,
  ) {
    this.ev.on('syncStart', (v) => {});
    if (Pfapi._wasInstanceCreated) {
      throw new Error(': This should only ever be instantiated once');
    }
    Pfapi._wasInstanceCreated = true;

    this.cfg = cfg;

    this.db = new Database({
      onError: cfg?.onDbError || (() => undefined),
      adapter:
        cfg?.dbAdapter ||
        new IndexedDbAdapter({
          // TODO to variable
          dbName: 'pf',
          dbMainName: 'main',
          version: 1,
        }),
    });

    this.tmpBackupService = new TmpBackupService<AllSyncModels<MD>>(this.db);

    this.metaModel = new MetaModelCtrl(this.db, this.ev);
    this.m = this._createModels(modelCfgs);
    pfLog(2, `m`, this.m);

    this.syncProviders = syncProviders;
    this.syncProviders.forEach((sp) => {
      sp.privateCfg = new SyncProviderPrivateCfgStore<unknown>(sp.id, this.db, this.ev);
    });

    this._syncService = new SyncService<MD>(
      this.m,
      this,
      this._activeSyncProvider$,
      this._encryptAndCompressCfg$,
      this.metaModel,
      new EncryptAndCompressHandlerService(),
    );
  }

  async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }> {
    return await this._wrapSyncAction(`${this.sync.name}()`, () =>
      this._syncService.sync(),
    );
  }

  async downloadAll(): Promise<void> {
    return await this._wrapSyncAction(`${this.downloadAll.name}()`, () =>
      this._syncService.downloadAll(),
    );
  }

  async uploadAll(isForceUpload: boolean = false): Promise<void> {
    return await this._wrapSyncAction(`${this.uploadAll.name}() f:${isForceUpload}`, () =>
      this._syncService.uploadAll(isForceUpload),
    );
  }

  private async _wrapSyncAction<T>(logPrefix: string, fn: () => Promise<T>): Promise<T> {
    try {
      pfLog(2, `${logPrefix}`);
      const result = await fn();
      pfLog(2, `${logPrefix} result:`, result);
      this.ev.emit('syncDone', result);
      this.ev.emit('syncStatusChange', 'IN_SYNC');
      return result;
    } catch (e) {
      this.ev.emit('syncError', e);
      this.ev.emit('syncDone', e);
      this.ev.emit('syncStatusChange', 'ERROR');
      throw e;
    }
  }

  setActiveSyncProvider(activeProviderId: SyncProviderId | null): void {
    pfLog(2, `${this.setActiveSyncProvider.name}()`, activeProviderId, activeProviderId);
    if (activeProviderId) {
      const provider = this.syncProviders.find((sp) => sp.id === activeProviderId);
      if (!provider) {
        throw new InvalidSyncProviderError();
      }
      this._activeSyncProvider$.next(provider);
      provider.isReady().then((isReady) => {
        this.ev.emit('providerReady', isReady);
      });
    } else {
      this.ev.emit('providerReady', false);
      this._activeSyncProvider$.next(null);
    }
  }

  getActiveSyncProvider(): SyncProviderServiceInterface<unknown> | null {
    return this._activeSyncProvider$.value;
  }

  async getSyncProviderById<T extends SyncProviderId>(
    providerId: T,
  ): Promise<SyncProviderServiceInterface<T>> {
    pfLog(2, `${this.getSyncProviderById.name}()`, providerId);
    const provider = this.syncProviders.find((sp) => sp.id === providerId);
    if (!provider) {
      throw new InvalidSyncProviderError();
    }
    // TODO typing
    return provider as SyncProviderServiceInterface<T>;
  }

  async getSyncProviderPrivateCfg<T extends SyncProviderId>(
    providerId: T,
  ): Promise<PrivateCfgByProviderId<T>> {
    pfLog(2, `${this.getSyncProviderPrivateCfg.name}()`, providerId);
    const provider = this.syncProviders.find((sp) => sp.id === providerId);
    if (!provider) {
      throw new InvalidSyncProviderError();
    }
    // TODO typing
    return (await provider.privateCfg.load()) as Promise<PrivateCfgByProviderId<T>>;
  }

  // TODO typing
  async setPrivateCfgForSyncProvider<T extends SyncProviderId>(
    providerId: T,
    privateCfg: PrivateCfgByProviderId<T>,
  ): Promise<void> {
    pfLog(2, `${this.setPrivateCfgForSyncProvider.name}()`, providerId, privateCfg);
    const provider = this.syncProviders.find((sp) => sp.id === providerId);
    if (!provider) {
      throw new InvalidSyncProviderError();
    }
    await provider.setPrivateCfg(privateCfg);

    if (this._activeSyncProvider$.value?.id === providerId) {
      this.ev.emit('providerReady', await this._activeSyncProvider$.value.isReady());
    }
  }

  setEncryptAndCompressCfg(cfg: EncryptAndCompressCfg): void {
    pfLog(2, `${this.setEncryptAndCompressCfg.name}()`, cfg);
    this._encryptAndCompressCfg$.next(cfg);
  }

  private _getAllSyncModelDataRetryCount = 0;

  // TODO improve naming with validity check
  async getAllSyncModelData(isSkipValidityCheck = false): Promise<AllSyncModels<MD>> {
    pfLog(2, `${this.getAllSyncModelData.name}()`);
    const modelIds = Object.keys(this.m);
    const promises = modelIds.map((modelId) => {
      const modelCtrl = this.m[modelId];
      return modelCtrl.load();
    });

    const allDataArr = await Promise.all(promises);
    const allData = allDataArr.reduce((acc, cur, idx) => {
      acc[modelIds[idx]] = cur;
      return acc;
    }, {});
    if (
      !isSkipValidityCheck &&
      this.cfg?.validate &&
      !this.cfg.validate(allData as AllSyncModels<MD>)
    ) {
      alert('actually got one!!! ' + this._getAllSyncModelDataRetryCount);
      if (this._getAllSyncModelDataRetryCount >= 1) {
        alert('THROW');
        this._getAllSyncModelDataRetryCount = 0;
        throw new DataValidationFailedError();
      }
      await promiseTimeout(1000);
      this._getAllSyncModelDataRetryCount++;
      return this.getAllSyncModelData(isSkipValidityCheck);
    }
    this._getAllSyncModelDataRetryCount = 0;
    return allData as AllSyncModels<MD>;
  }

  async loadCompleteBackup(isSkipValidityCheck = false): Promise<CompleteBackup<MD>> {
    const d = await this.getAllSyncModelData(isSkipValidityCheck);
    const meta = await this.metaModel.loadMetaModel();
    return {
      data: d,
      crossModelVersion: meta.crossModelVersion,
      modelVersions: meta.modelVersions,
      lastUpdate: meta.lastUpdate,
      timestamp: Date.now(),
    };
  }

  async importCompleteBackup(backup: CompleteBackup<MD>): Promise<void> {
    return await this.importAllSycModelData({
      data: backup.data,
      crossModelVersion: backup.crossModelVersion,
      // TODO maybe also make model versions work
      isBackupData: true,
      isAttemptRepair: true,
    });
  }

  // TODO
  // async importCompleteBackup

  async importAllSycModelData({
    data,
    crossModelVersion,
    isAttemptRepair = false,
    isBackupData = false,
  }: {
    data: AllSyncModels<MD>;
    crossModelVersion: number;
    isAttemptRepair?: boolean;
    isBackupData?: boolean;
  }): Promise<void> {
    pfLog(2, `${this.importAllSycModelData.name}()`, { data, cfg: this.cfg });

    // TODO migrations
    if (this.cfg?.validate && !this.cfg.validate(data)) {
      if (isAttemptRepair && this.cfg.repair) {
        data = this.cfg.repair(data);
      }
      throw new DataValidationFailedError();
    }

    if (isBackupData) {
      try {
        await this.tmpBackupService.save(await this.getAllSyncModelData());
      } catch (error) {
        pfLog(1, this.importAllSycModelData.name, error);
        console.warn(
          'Could not create valid backup. Onwards on the highway throug the Danger Zone!',
        );
        console.error(error);
      }
    }

    try {
      this.db.lock();
      const modelIds = Object.keys(data);
      const promises = modelIds.map((modelId) => {
        const modelData = data[modelId];
        const modelCtrl = this.m[modelId];
        if (!modelCtrl) {
          console.warn('ModelId without Ctrl', modelId, modelData);
          if (
            confirm(
              `ModelId "${modelId}" was found in data. The model seems to be outdated. Ignore and proceed to import anyway?`,
            )
          ) {
            return Promise.resolve();
          }
          throw new ModelIdWithoutCtrlError(modelId, modelData);
        }

        return modelCtrl.save(modelData, {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        });
      });
      await Promise.all(promises);
      this.db.unlock();
    } catch (e) {
      this.db.unlock();
      const backup = await this.tmpBackupService.load();
      if (backup) {
        try {
          await this.importAllSycModelData({
            data: backup,
            crossModelVersion: this.cfg?.crossModelVersion || 0,
          });
        } catch (eII) {
          throw new BackupImportFailedError(eII);
        }
      }
      throw e;
    }

    if (isBackupData) {
      await this.tmpBackupService.clear();
    }
  }

  isValidateComplete(data: AllSyncModels<MD>): boolean {
    pfLog(2, `${this.isValidateComplete.name}()`, { data });
    if (!this.cfg?.validate) {
      throw new NoValidateFunctionProvidedError();
    }
    return this.cfg.validate(data);
    // we don't do this!!!! => throw new DataValidationFailedError();
  }

  repairCompleteData(data: unknown): AllSyncModels<MD> {
    pfLog(2, `${this.repairCompleteData.name}()`, { data });
    if (!this.cfg?.repair) {
      throw new NoRepairFunctionProvidedError();
    }
    return this.cfg.repair(data);
  }

  private _createModels(modelCfgs: MD): ModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, ModelCtrl<ModelBase>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      if (!item.modelVersion) {
        throw new InvalidModelCfgError({ modelCfgs });
      }
      result[id] = new ModelCtrl<ExtractModelCfgType<typeof item>>(
        id,
        item,
        this.db,
        this.metaModel,
      );
    }
    return result as ModelCfgToModelCtrl<MD>;
  }
}
