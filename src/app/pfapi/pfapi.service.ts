import { inject, Injectable } from '@angular/core';
import {
  CompleteBackup,
  LocalMeta,
  ModelCfgToModelCtrl,
  Pfapi,
  SyncProviderId,
  SyncStatusChangePayload,
} from './api';
import { Observable } from 'rxjs';
import { LS } from '../core/persistence/storage-keys.const';
import {
  AppDataCompleteNew,
  CROSS_MODEL_VERSION,
  PFAPI_CFG,
  PFAPI_MODEL_CFGS,
  PFAPI_SYNC_PROVIDERS,
  PfapiAllModelCfg,
} from './pfapi-config';
import { T } from '../t.const';
import { TranslateService } from '@ngx-translate/core';
import { ImexViewService } from '../imex/imex-meta/imex-view.service';
import { Store } from '@ngrx/store';
import { selectSyncConfig } from '../features/config/store/global-config.reducer';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
} from 'rxjs/operators';
import { fromPfapiEvent, pfapiEventAndInitialAfter } from './pfapi-helper';
import { DataInitStateService } from '../core/data-init/data-init-state.service';
import { GlobalProgressBarService } from '../core-ui/global-progress-bar/global-progress-bar.service';
import { PFLog } from '../core/log';
import { PfapiStoreDelegateService } from './pfapi-store-delegate.service';
import { OperationLogStoreService } from '../op-log/store/operation-log-store.service';
import { Operation, OpType } from '../op-log/core/operation.types';
import { CURRENT_SCHEMA_VERSION } from '../op-log/store/schema-migration.service';
import { incrementVectorClock } from './api/util/vector-clock';
import { uuidv7 } from '../util/uuid-v7';
import { loadAllData } from '../root-store/meta/load-all-data.action';
import { VectorClockService } from '../op-log/sync/vector-clock.service';
import { SnackService } from '../core/snack/snack.service';

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  private _translateService = inject(TranslateService);
  private _dataInitStateService = inject(DataInitStateService);
  private _globalProgressBarService = inject(GlobalProgressBarService);
  private _imexViewService = inject(ImexViewService);
  private _store = inject(Store);
  private _storeDelegateService = inject(PfapiStoreDelegateService);
  private _opLogStore = inject(OperationLogStoreService);
  private _vectorClockService = inject(VectorClockService);
  private _snackService = inject(SnackService);

  public readonly pf = new Pfapi(PFAPI_MODEL_CFGS, PFAPI_SYNC_PROVIDERS, PFAPI_CFG);
  public readonly m: ModelCfgToModelCtrl<PfapiAllModelCfg> = this.pf.m;

  // NOTE: subscribing to this to early (e.g. in a constructor), might mess up due to share replay
  public readonly isSyncProviderEnabledAndReady$ = pfapiEventAndInitialAfter(
    this._dataInitStateService.isAllDataLoadedInitially$,
    this.pf.ev,
    'providerReady',
    async () => {
      const activeProvider = this.pf.getActiveSyncProvider();
      return activeProvider ? activeProvider.isReady() : Promise.resolve(false);
    },
  ).pipe(
    shareReplay(1),
    distinctUntilChanged(),
    // tap((v) => PFLog.log(`isSyncProviderEnabledAndReady$`, v)),
  );

  public readonly currentProviderPrivateCfg$ = pfapiEventAndInitialAfter(
    this._dataInitStateService.isAllDataLoadedInitially$,
    this.pf.ev,
    'providerPrivateCfgChange',
    async () => {
      const activeProvider = this.pf.getActiveSyncProvider();
      return activeProvider
        ? activeProvider.privateCfg.load().then((d) => ({
            privateCfg: d,
            providerId: activeProvider.id,
          }))
        : Promise.resolve(null);
    },
  ).pipe(shareReplay(1));

  public readonly syncState$: Observable<SyncStatusChangePayload> =
    pfapiEventAndInitialAfter(
      this._dataInitStateService.isAllDataLoadedInitially$,
      this.pf.ev,
      'syncStatusChange',
      async () => 'UNKNOWN_OR_CHANGED' as SyncStatusChangePayload,
    ).pipe(shareReplay(1));

  private readonly _isSyncInProgress$: Observable<boolean> = this.syncState$.pipe(
    filter((state) => state !== 'UNKNOWN_OR_CHANGED'),
    map((state) => state === 'SYNCING'),
    startWith(false),
    distinctUntilChanged(),
    shareReplay(1),
  );

  private readonly _commonAndLegacySyncConfig$ =
    this._dataInitStateService.isAllDataLoadedInitially$.pipe(
      concatMap(() => this._store.select(selectSyncConfig)),
    );

  onLocalMetaUpdate$: Observable<LocalMeta> = fromPfapiEvent(
    this.pf.ev,
    'metaModelChange',
  );

  constructor() {
    // TODO check why it gets triggered twice always
    // this.syncState$.subscribe((v) => PFLog.log(`syncState$`, v));
    this._isSyncInProgress$.subscribe((v) => {
      // PFLog.log('isSyncInProgress$', v);
      if (v) {
        this._globalProgressBarService.countUp('SYNC');
      } else {
        this._globalProgressBarService.countDown();
      }
    });

    this._commonAndLegacySyncConfig$.subscribe((cfg) => {
      try {
        const newProviderId = cfg.isEnabled
          ? (cfg.syncProvider as unknown as SyncProviderId)
          : null;
        this.pf.setActiveSyncProvider(newProviderId);
        if (cfg.isEnabled) {
          this.pf.setEncryptAndCompressCfg({
            isEncrypt: !!cfg.isEncryptionEnabled,
            isCompress: !!cfg.isCompressionEnabled,
          });
          // NOTE: Don't trigger sync here - SyncEffects.triggerSync$ handles initial sync
          // to avoid "Sync already in progress" errors from duplicate sync calls
        }
      } catch (e) {
        PFLog.err('Failed to set sync provider:', e);
        const errorMsg =
          e instanceof Error ? e.message : 'Unknown error - check console for details';
        alert(`Unable to set sync provider: ${errorMsg}`);
      }
    });

    // Wire up NgRx store delegate for operation log sync
    // Legacy sync reads from NgRx store instead of ModelCtrl caches
    PFLog.normal('PfapiService: Enabling NgRx store delegate for op-log sync');
    this.pf.setGetAllSyncModelDataFromStoreDelegate(() =>
      this._storeDelegateService.getAllSyncModelDataFromStore(),
    );

    // Notify user when save is blocked during sync
    this.pf.ev.on('saveBlocked', ({ key }) => {
      PFLog.warn(`PfapiService: Save blocked for ${key} during sync`);
      this._snackService.open({
        msg: T.GLOBAL_SNACK.SAVE_BLOCKED_DURING_SYNC,
        type: 'CUSTOM',
      });
    });
  }

  async importCompleteBackup(
    data: AppDataCompleteNew | CompleteBackup<PfapiAllModelCfg>,
    isSkipLegacyWarnings: boolean = false,
    isSkipReload: boolean = false,
    isForceConflict: boolean = false,
  ): Promise<void> {
    try {
      this._imexViewService.setDataImportInProgress(true);

      // 1. Normalize backup structure
      let backupData: AppDataCompleteNew;
      let crossModelVersion: number;

      if ('crossModelVersion' in data && 'timestamp' in data && 'data' in data) {
        backupData = data.data;
        crossModelVersion = data.crossModelVersion;
      } else {
        backupData = data as AppDataCompleteNew;
        crossModelVersion = 0; // Legacy data
      }

      // 2. Migrate and validate (no 'pf' save)
      const validatedData = await this.pf.migrateAndValidateImportData({
        data: backupData,
        crossModelVersion,
        isAttemptRepair: true,
        isSkipLegacyWarnings,
      });

      // 3. Persist to operation log
      await this._persistImportToOperationLog(
        validatedData as AppDataCompleteNew,
        isForceConflict,
      );

      // 4. Dispatch to NgRx (no page reload needed!)
      this._store.dispatch(loadAllData({ appDataComplete: validatedData }));

      // 5. Update ModelCtrl caches so services reading from pf.m.*.load() get fresh data
      // This is needed because TaskArchiveService and others read from ModelCtrl, not NgRx
      await this._updateModelCtrlCaches(validatedData as AppDataCompleteNew);

      this._imexViewService.setDataImportInProgress(false);

      // Only reload if explicitly requested (legacy behavior fallback)
      if (!isSkipReload && isForceConflict) {
        // Force conflict may need reload to reset sync state
        window.location.reload();
      }
    } catch (e) {
      this._imexViewService.setDataImportInProgress(false);
      throw e;
    }
  }

  private async _persistImportToOperationLog(
    importedData: AppDataCompleteNew,
    isForceConflict: boolean,
  ): Promise<void> {
    PFLog.normal('PfapiService: Persisting import to operation log...');

    // 1. Backup current state before clearing operations
    //    This allows manual recovery if the import causes issues
    let backupSucceeded = true;
    try {
      const existingStateCache = await this._opLogStore.loadStateCache();
      if (existingStateCache?.state) {
        PFLog.normal('PfapiService: Backing up current state before import...');
        await this._opLogStore.saveImportBackup(existingStateCache.state);
      }
    } catch (e) {
      PFLog.warn('PfapiService: Failed to backup state before import:', e);
      backupSucceeded = false;
    }

    // 2. Clear all old operations to prevent IndexedDB bloat
    //    Each SYNC_IMPORT contains the full app state (10-30MB+) and they accumulate
    //    Only clear if backup succeeded - otherwise keep old ops as fallback
    if (backupSucceeded) {
      PFLog.normal('PfapiService: Clearing old operations before import...');
      await this._opLogStore.clearAllOperations();
    } else {
      PFLog.warn(
        'PfapiService: Skipping operation cleanup - backup failed, keeping old ops as fallback',
      );
    }

    const clientId = isForceConflict
      ? await this.pf.metaModel.generateNewClientId()
      : await this.pf.metaModel.loadClientId();

    const currentClock = await this._vectorClockService.getCurrentVectorClock();
    const newClock = isForceConflict
      ? { [clientId]: 2 } // Fresh vector clock
      : incrementVectorClock(currentClock, clientId);

    const opId = uuidv7();
    const op: Operation = {
      id: opId,
      actionType: '[SP_ALL] Load(import) all data',
      opType: OpType.SyncImport,
      entityType: 'ALL',
      entityId: opId, // Use opId as entityId to ensure uniqueness for conflict resolution
      payload: { appDataComplete: importedData }, // Wrap to match loadAllData action shape
      clientId,
      vectorClock: newClock,
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    await this._opLogStore.append(op, 'local');
    const lastSeq = await this._opLogStore.getLastSeq();

    await this._opLogStore.saveStateCache({
      state: importedData,
      lastAppliedOpSeq: lastSeq,
      vectorClock: newClock,
      compactedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });

    PFLog.normal('PfapiService: Import persisted to operation log.');
  }

  /**
   * Updates ModelCtrl in-memory caches with imported data.
   * This ensures services that read from pf.m.*.load() (like TaskArchiveService)
   * get the fresh imported data instead of stale cached data.
   */
  private async _updateModelCtrlCaches(data: AppDataCompleteNew): Promise<void> {
    PFLog.normal('PfapiService: Updating ModelCtrl caches...');

    const modelIds = Object.keys(data);
    const promises = modelIds.map((modelId) => {
      const modelCtrl = this.pf.m[modelId as keyof typeof this.pf.m];
      const modelData = (data as Record<string, unknown>)[modelId];
      if (modelCtrl && modelData !== undefined) {
        // Save updates both in-memory cache and 'pf' database
        return modelCtrl.save(modelData as never, {
          isUpdateRevAndLastUpdate: false,
          isIgnoreDBLock: true,
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    PFLog.normal('PfapiService: ModelCtrl caches updated.');
  }

  async isCheckForStrayLocalTmpDBBackupAndImport(): Promise<void> {
    const backup = await this.pf.tmpBackupService.load();
    if (!localStorage.getItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP)) {
      if (backup) {
        await this.pf.tmpBackupService.clear();
      }
      localStorage.setItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP, 'true');
    }
    if (backup) {
      if (confirm(this._translateService.instant(T.CONFIRM.RESTORE_STRAY_BACKUP))) {
        await this.pf.importAllSycModelData({
          data: backup,
          crossModelVersion: CROSS_MODEL_VERSION,
          isBackupData: false,
          isAttemptRepair: false,
        });
        await this.pf.tmpBackupService.clear();
        return;
      } else {
        await this.pf.tmpBackupService.clear();
      }
    }
    return;
  }
}
