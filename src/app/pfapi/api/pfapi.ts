import {
  AllSyncModels,
  CompleteBackup,
  ConflictData,
  EncryptAndCompressCfg,
  ExtractModelCfgType,
  MainModelData,
  ModelBase,
  ModelCfgs,
  ModelCfgToModelCtrl,
  PfapiBaseCfg,
  PrivateCfgByProviderId,
  VectorClock,
} from './pfapi.model';
import { SyncService } from './sync/sync.service';
import { Database } from './db/database';
import { IndexedDbAdapter } from './db/indexed-db-adapter';
import { MetaModelCtrl } from './model-ctrl/meta-model-ctrl';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { MiniObservable } from './util/mini-observable';
import { SyncProviderServiceInterface } from './sync/sync-provider.interface';
import { PFLog } from '../../core/log';
import { SyncProviderId, SyncStatus } from './pfapi.const';
import { EncryptAndCompressHandlerService } from './sync/encrypt-and-compress-handler.service';
import { SyncProviderPrivateCfgStore } from './sync/sync-provider-private-cfg-store';
import {
  BackupImportFailedError,
  DataValidationFailedError,
  InvalidSyncProviderError,
  ModelIdWithoutCtrlError,
  NoRepairFunctionProvidedError,
  NoSyncProviderSetError,
  NoValidateFunctionProvidedError,
} from './errors/errors';
import { TmpBackupService } from './backup/tmp-backup.service';
import { promiseTimeout } from '../../util/promise-timeout';
import { PFEventEmitter } from './util/events';
import { MigrationService } from './migration/migration.service';
import { IValidation } from 'typia';
import { OperationLogSyncService } from '../../op-log/sync/operation-log-sync.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { inject } from '@angular/core'; // Inject is used here

export class Pfapi<const MD extends ModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _syncService: SyncService<MD>;
  private readonly _activeSyncProvider$ =
    new MiniObservable<SyncProviderServiceInterface<SyncProviderId> | null>(
      null,
      NoSyncProviderSetError as typeof Error,
    );

  private readonly _encryptAndCompressCfg$ = new MiniObservable<EncryptAndCompressCfg>({
    isCompress: false,
    isEncrypt: false,
  });

  private _isSyncInProgress = false;

  get isSyncInProgress(): boolean {
    return this._isSyncInProgress;
  }

  public readonly wasDataMigratedInitiallyPromise: Promise<void>;

  public readonly tmpBackupService: TmpBackupService<AllSyncModels<MD>>;
  public readonly db: Database;
  public readonly metaModel: MetaModelCtrl;
  public readonly m: ModelCfgToModelCtrl<MD>;
  public readonly ev = new PFEventEmitter();
  public readonly migrationService: MigrationService<MD>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _operationLogSyncService = inject(OperationLogSyncService); // Inject the service here

  /**
   * Delegate function to get all sync model data from an external source (e.g., NgRx store).
   * When set, this will be used by getAllSyncModelData() instead of reading from ModelCtrl caches.
   * This is needed because persistence happens via OperationLogEffects to SUP_OPS,
   * so ModelCtrl caches are stale and we need to read from NgRx store instead.
   */
  private _getAllSyncModelDataFromStoreDelegate:
    | (() => Promise<AllSyncModels<MD>>)
    | null = null;

  constructor(
    modelCfgs: MD,
    public syncProviders: SyncProviderServiceInterface<SyncProviderId>[],
    public cfg?: PfapiBaseCfg<MD>,
  ) {
    this.ev.on('syncStart', (v) => {});
    if (Pfapi._wasInstanceCreated) {
      throw new Error(': This should only ever be instantiated once');
    }
    Pfapi._wasInstanceCreated = true;

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
      onSaveBlocked: (key: string) => this.ev.emit('saveBlocked', { key }),
    });

    this.tmpBackupService = new TmpBackupService<AllSyncModels<MD>>(this.db);

    this.metaModel = new MetaModelCtrl(
      this.db,
      this.ev,
      this.cfg?.crossModelVersion || 0,
    );
    this.m = this._createModels(modelCfgs);
    PFLog.normal(`m`, this.m);

    this.syncProviders = syncProviders;
    this.syncProviders.forEach((sp) => {
      sp.privateCfg = new SyncProviderPrivateCfgStore(sp.id, this.db, this.ev);
    });

    this.migrationService = new MigrationService<MD>(this);

    this._syncService = new SyncService<MD>(
      this.m,
      this,
      this.metaModel,
      this._activeSyncProvider$,
      this._encryptAndCompressCfg$,
      new EncryptAndCompressHandlerService(),
      this._operationLogSyncService, // Pass the new service here
    );

    this.wasDataMigratedInitiallyPromise = this.migrationService.checkAndMigrateLocalDB();
  }

  async sync(): Promise<{
    status: SyncStatus;
    conflictData?: ConflictData;
    downloadedMainModelData?: MainModelData;
  }> {
    return await this._wrapSyncAction(`${this.sync.name}()`, () =>
      this._syncService.sync(),
    );
  }

  async downloadAll(isSkipRevChange: boolean = false): Promise<void> {
    return await this._wrapSyncAction(`${this.downloadAll.name}()`, () =>
      this._syncService.downloadAll(isSkipRevChange),
    );
  }

  async uploadAll(isForceUpload: boolean = false): Promise<void> {
    return await this._wrapSyncAction(`${this.uploadAll.name}() f:${isForceUpload}`, () =>
      this._syncService.uploadAll(isForceUpload),
    );
  }

  private async _wrapSyncAction<T>(logPrefix: string, fn: () => Promise<T>): Promise<T> {
    // Check if sync is already in progress
    if (this._isSyncInProgress) {
      PFLog.normal(`${logPrefix} SKIPPED - sync already in progress`);
      throw new Error('Sync already in progress');
    }

    // Set sync in progress flag
    this._isSyncInProgress = true;

    // Lock the database during sync to prevent concurrent modifications
    this.db.lock();

    try {
      PFLog.normal(`${logPrefix}`);
      this.ev.emit('syncStatusChange', 'SYNCING');
      const result = await fn();
      PFLog.normal(`${logPrefix} result:`, result);
      this.ev.emit('syncDone', result);
      // Keep lock until after status change to prevent race conditions
      this.ev.emit('syncStatusChange', 'IN_SYNC');
      return result;
    } catch (e) {
      this.ev.emit('syncError', e);
      this.ev.emit('syncDone', e);
      this.ev.emit('syncStatusChange', 'ERROR');
      throw e;
    } finally {
      // Always unlock the database and clear sync flag, even on error
      this.db.unlock();
      this._isSyncInProgress = false;
    }
  }

  setActiveSyncProvider(activeProviderId: SyncProviderId | null): void {
    PFLog.normal(
      `${this.setActiveSyncProvider.name}()`,
      activeProviderId,
      activeProviderId,
    );
    if (activeProviderId) {
      const provider = this.syncProviders.find((sp) => sp.id === activeProviderId);
      if (!provider) {
        PFLog.log(provider, activeProviderId);
        throw new InvalidSyncProviderError();
      }

      // Pre-warm the private config cache (fire-and-forget).
      // This reduces IndexedDB reads during sync startup by ensuring
      // the config is already cached when sync operations begin.
      provider.privateCfg.load().catch((e) => {
        PFLog.warn('Failed to pre-warm privateCfg cache:', e);
      });

      this._activeSyncProvider$.next(provider);
      provider.isReady().then((isReady) => {
        this.ev.emit('providerReady', isReady);
      });
    } else {
      this.ev.emit('providerReady', false);
      this._activeSyncProvider$.next(null);
    }
  }

  getActiveSyncProvider(): SyncProviderServiceInterface<SyncProviderId> | null {
    return this._activeSyncProvider$.value;
  }

  async getSyncProviderById<T extends SyncProviderId>(
    providerId: T,
  ): Promise<SyncProviderServiceInterface<T>> {
    PFLog.normal(`${this.getSyncProviderById.name}()`, providerId);
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
    PFLog.normal(`${this.getSyncProviderPrivateCfg.name}()`, providerId);
    const provider = this.syncProviders.find((sp) => sp.id === providerId);
    if (!provider) {
      throw new InvalidSyncProviderError();
    }
    // TODO typing
    return (await provider.privateCfg.load()) as PrivateCfgByProviderId<T>;
  }

  // TODO typing
  async setPrivateCfgForSyncProvider<T extends SyncProviderId>(
    providerId: T,
    privateCfg: PrivateCfgByProviderId<T>,
  ): Promise<void> {
    PFLog.normal(
      `${this.setPrivateCfgForSyncProvider.name}()`,
      providerId,
      privateCfg &&
        Object.keys(privateCfg).map((k) => k + ':' + typeof (privateCfg as any)[k]),
    );
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
    PFLog.normal(`${this.setEncryptAndCompressCfg.name}()`, cfg);
    this._encryptAndCompressCfg$.next(cfg);
  }

  /**
   * Sets the delegate function to get sync model data from NgRx store.
   * This should be called by PfapiService when operation log sync is enabled.
   * @param delegate Function that returns all sync model data from NgRx store
   */
  setGetAllSyncModelDataFromStoreDelegate(
    delegate: (() => Promise<AllSyncModels<MD>>) | null,
  ): void {
    PFLog.normal(
      `${this.setGetAllSyncModelDataFromStoreDelegate.name}()`,
      delegate ? 'set' : 'cleared',
    );
    this._getAllSyncModelDataFromStoreDelegate = delegate;
  }

  private _getAllSyncModelDataRetryCount = 0;

  // TODO improve naming with validity check
  async getAllSyncModelData(isSkipValidityCheck = false): Promise<AllSyncModels<MD>> {
    PFLog.normal(`${this.getAllSyncModelData.name}()`);

    let allData: AllSyncModels<MD>;

    // Use the delegate to read from NgRx store instead of ModelCtrl caches
    // (ModelCtrl caches are stale because persistence happens via OperationLogEffects)
    if (this._getAllSyncModelDataFromStoreDelegate) {
      PFLog.normal(`${this.getAllSyncModelData.name}(): Using NgRx store delegate`);
      allData = await this._getAllSyncModelDataFromStoreDelegate();
    } else {
      // Legacy path: read from ModelCtrl caches (pf database)
      const modelIds = Object.keys(this.m);
      const promises = modelIds.map((modelId) => {
        const modelCtrl = this.m[modelId];
        return modelCtrl.load();
      });

      const allDataArr = await Promise.all(promises);
      allData = allDataArr.reduce((acc, cur, idx) => {
        acc[modelIds[idx]] = cur;
        return acc;
      }, {}) as AllSyncModels<MD>;
    }

    // TODO maybe remove validation check, since we already validate on every import and save
    const validationResultIfNeeded =
      !isSkipValidityCheck &&
      this.cfg?.validate &&
      this.cfg.validate(allData as AllSyncModels<MD>);
    if (validationResultIfNeeded && !validationResultIfNeeded.success) {
      PFLog.error('ACTUALLY GOT ONE!!', validationResultIfNeeded);
      if (this._getAllSyncModelDataRetryCount >= 1) {
        PFLog.error('ACTUALLY GOT ONE 2!! ERROR', validationResultIfNeeded);
        this._getAllSyncModelDataRetryCount = 0;
        throw new DataValidationFailedError(validationResultIfNeeded);
      }
      await promiseTimeout(1000);
      this._getAllSyncModelDataRetryCount++;
      return this.getAllSyncModelData(isSkipValidityCheck);
    }
    this._getAllSyncModelDataRetryCount = 0;
    return allData as AllSyncModels<MD>;
  }

  /**
   * Read all sync model data directly from ModelCtrl caches ('pf' database).
   * This bypasses the NgRx delegate and is used after sync download to get
   * the newly synced data before it's loaded into NgRx.
   */
  async getAllSyncModelDataFromModelCtrls(): Promise<AllSyncModels<MD>> {
    PFLog.normal(`${this.getAllSyncModelDataFromModelCtrls.name}()`);
    const modelIds = Object.keys(this.m);
    const promises = modelIds.map((modelId) => {
      const modelCtrl = this.m[modelId];
      return modelCtrl.load();
    });

    const allDataArr = await Promise.all(promises);
    return allDataArr.reduce((acc, cur, idx) => {
      acc[modelIds[idx]] = cur;
      return acc;
    }, {}) as AllSyncModels<MD>;
  }

  async loadCompleteBackup(isSkipValidityCheck = false): Promise<CompleteBackup<MD>> {
    const d = await this.getAllSyncModelData(isSkipValidityCheck);
    const meta = await this.metaModel.load();
    return {
      data: d,
      crossModelVersion: meta.crossModelVersion,
      lastUpdate: meta.lastUpdate,
      timestamp: Date.now(),
    };
  }

  async importCompleteBackup(
    backup: CompleteBackup<MD>,
    isSkipLegacyWarnings: boolean = false,
    isForceConflict: boolean = false,
  ): Promise<void> {
    // Validate that backup.data exists
    if (!backup.data) {
      PFLog.err(
        `${this.importCompleteBackup.name}() backup.data is ${backup.data}. ` +
          `Backup keys: ${Object.keys(backup).join(', ')}. ` +
          `This might indicate a malformed backup file format.`,
      );
      throw new Error(
        `Invalid backup format: backup.data is ${backup.data}. ` +
          `Expected a nested 'data' property containing the model data. ` +
          `Backup has keys: ${Object.keys(backup).join(', ')}`,
      );
    }

    // First import the data
    await this.importAllSycModelData({
      data: backup.data,
      crossModelVersion: backup.crossModelVersion,
      // TODO maybe also make model versions work
      isBackupData: true,
      isAttemptRepair: true,
      isSkipLegacyWarnings,
    });

    // If we want to force a conflict, reset sync metadata with fresh vector clock
    if (isForceConflict) {
      // Generate a new client ID to represent this as a fresh client
      const newClientId = await this.metaModel.generateNewClientId();

      // Create a fresh vector clock with just this client
      const freshVectorClock: VectorClock = {
        // NOTE we set local change count to 2 to avoid MINIMAL_UPDATE_THRESHOLD in getSyncStatusFromMetaFiles()
        [newClientId]: 2,
      };

      await this.metaModel.save({
        crossModelVersion: backup.crossModelVersion,
        lastUpdate: Date.now(),
        lastSyncedUpdate: null, // No sync history
        lastSyncedVectorClock: null, // No sync history
        vectorClock: freshVectorClock,
        metaRev: null, // No remote rev
        lastUpdateAction: 'Restored from backup with fresh sync state',
        revMap: {}, // Will be populated on next save
      });
    }
  }

  /**
   * Migrates and validates import data without persisting to 'pf' database.
   * Used for operation-log-based imports where data goes directly to SUP_OPS.
   */
  async migrateAndValidateImportData({
    data,
    crossModelVersion,
    isAttemptRepair = false,
    isSkipLegacyWarnings = false,
  }: {
    data: AllSyncModels<MD>;
    crossModelVersion: number;
    isAttemptRepair?: boolean;
    isSkipLegacyWarnings?: boolean;
  }): Promise<AllSyncModels<MD>> {
    PFLog.normal(`${this.migrateAndValidateImportData.name}()`);

    // 1. Run migrations
    const { dataAfter } = await this.migrationService.migrate(crossModelVersion, data);
    data = dataAfter;

    // 2. Validate
    if (this.cfg?.validate) {
      const validationResult = this.cfg.validate(data);
      if (!validationResult.success) {
        PFLog.critical(
          `${this.migrateAndValidateImportData.name}() data not valid`,
          validationResult,
        );
        if (isAttemptRepair && this.cfg.repair) {
          PFLog.critical(`${this.migrateAndValidateImportData.name}() attempting repair`);
          data = this.cfg.repair(data, (validationResult as IValidation.IFailure).errors);
          const r2 = this.cfg.validate(data);
          if (!r2.success) {
            throw new DataValidationFailedError(r2);
          }
        } else {
          throw new DataValidationFailedError(validationResult);
        }
      }
    }

    // 3. Filter out legacy model IDs
    const SKIPPED_MODEL_IDS = ['lastLocalSyncModelChange', 'lastArchiveUpdate'];
    const filteredData = { ...data } as AllSyncModels<MD>;
    for (const modelId of Object.keys(filteredData)) {
      if (SKIPPED_MODEL_IDS.includes(modelId)) {
        delete (filteredData as Record<string, unknown>)[modelId];
      } else if (!this.m[modelId] && !isSkipLegacyWarnings) {
        PFLog.err(
          'ModelId without Ctrl',
          modelId,
          (filteredData as Record<string, unknown>)[modelId],
        );
        if (
          !confirm(
            `ModelId "${modelId}" was found in data. The model seems to be outdated. Ignore and proceed to import anyway?`,
          )
        ) {
          throw new ModelIdWithoutCtrlError(
            modelId,
            (filteredData as Record<string, unknown>)[modelId],
          );
        }
        delete (filteredData as Record<string, unknown>)[modelId];
      }
    }

    return filteredData;
  }

  async importAllSycModelData({
    data,
    crossModelVersion,
    isAttemptRepair = false,
    isBackupData = false,
    isSkipLegacyWarnings = false,
    isBackupImport = false,
  }: {
    data: AllSyncModels<MD>;
    crossModelVersion: number;
    isAttemptRepair?: boolean;
    isBackupData?: boolean;
    isSkipLegacyWarnings?: boolean;
    isBackupImport?: boolean;
  }): Promise<void> {
    PFLog.normal(`${this.importAllSycModelData.name}()`, { data, cfg: this.cfg });

    const { dataAfter } = await this.migrationService.migrate(crossModelVersion, data);
    data = dataAfter;

    if (this.cfg?.validate) {
      // Debug logging for archive validation issues
      const dataAny = data as any;
      PFLog.normal(`${this.importAllSycModelData.name}() pre-validation check:`, {
        hasArchiveYoung: 'archiveYoung' in dataAny,
        archiveYoungType: typeof dataAny?.archiveYoung,
        archiveYoungIsNull: dataAny?.archiveYoung === null,
        hasArchiveOld: 'archiveOld' in dataAny,
        archiveOldType: typeof dataAny?.archiveOld,
        archiveOldIsNull: dataAny?.archiveOld === null,
        dataKeys: Object.keys(dataAny || {}),
      });

      const validationResult = this.cfg.validate(data);
      if (!validationResult.success) {
        PFLog.critical(
          `${this.importAllSycModelData.name}() data not valid`,
          validationResult,
        );
        if (isAttemptRepair && this.cfg.repair) {
          PFLog.critical(`${this.importAllSycModelData.name}() attempting repair`);
          data = this.cfg.repair(data, (validationResult as IValidation.IFailure).errors);

          const r2 = this.cfg.validate(data);
          if (!r2.success) {
            throw new DataValidationFailedError(r2);
          }
        } else {
          throw new DataValidationFailedError(validationResult);
        }
      }
    }

    if (isBackupData) {
      try {
        await this.tmpBackupService.save(await this.getAllSyncModelData());
      } catch (error) {
        PFLog.critical(this.importAllSycModelData.name, error);
        PFLog.err(
          'Could not create valid backup. Onwards on the highway throug the Danger Zone!',
        );
        PFLog.err(error);
      }
    }

    try {
      this.db.lock();
      const modelIds = Object.keys(data);
      const SKIPPED_MODEL_IDS = ['lastLocalSyncModelChange', 'lastArchiveUpdate'];
      const promises = modelIds.map((modelId) => {
        const modelData = data[modelId];
        const modelCtrl = this.m[modelId];
        if (!modelCtrl) {
          PFLog.err('ModelId without Ctrl', modelId, modelData);
          if (
            SKIPPED_MODEL_IDS.includes(modelId) ||
            isSkipLegacyWarnings ||
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
    } catch (e) {
      const backup = await this.tmpBackupService.load();
      // isBackupImport is used to prevent endless loop
      if (backup && !isBackupImport) {
        // TODO fix endless loop
        try {
          await this.importAllSycModelData({
            data: backup,
            crossModelVersion: this.cfg?.crossModelVersion || 0,
            isBackupImport: true,
          });
        } catch (eII) {
          throw new BackupImportFailedError(eII);
        }
      }
      throw e;
    } finally {
      this.db.unlock();
    }

    if (isBackupData) {
      await this.tmpBackupService.clear();
    }
  }

  isValidateComplete(data: AllSyncModels<MD>): boolean {
    PFLog.normal(`${this.isValidateComplete.name}()`, { data });
    if (!this.cfg?.validate) {
      throw new NoValidateFunctionProvidedError();
    }
    return this.cfg.validate(data).success;
    // we don't do this!!!! => throw new DataValidationFailedError();
  }

  repairCompleteData(data: unknown, errors: IValidation.IError[]): AllSyncModels<MD> {
    PFLog.normal(`${this.repairCompleteData.name}()`, { data });
    if (!this.cfg?.repair) {
      throw new NoRepairFunctionProvidedError();
    }
    return this.cfg.repair(data, errors);
  }

  validate(data: unknown): IValidation<AllSyncModels<MD>> {
    PFLog.normal(`${this.validate.name}()`, { data });
    if (!this.cfg?.validate) {
      throw new NoValidateFunctionProvidedError();
    }
    return this.cfg.validate(data as any);
  }

  private _createModels(modelCfgs: MD): ModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, ModelCtrl<ModelBase>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
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
