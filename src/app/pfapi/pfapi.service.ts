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
} from 'rxjs/operators';
import { fromPfapiEvent, pfapiEventAndInitialAfter } from './pfapi-helper';
import { DataInitStateService } from '../core/data-init/data-init-state.service';
import { GlobalProgressBarService } from '../core-ui/global-progress-bar/global-progress-bar.service';

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  private _translateService = inject(TranslateService);
  private _dataInitStateService = inject(DataInitStateService);
  private _globalProgressBarService = inject(GlobalProgressBarService);
  private _imexViewService = inject(ImexViewService);
  private _store = inject(Store);

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
    // tap((v) => console.log(`isSyncProviderEnabledAndReady$`, v)),
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

  public readonly isSyncInProgress$: Observable<boolean> = this.syncState$.pipe(
    filter((state) => state !== 'UNKNOWN_OR_CHANGED'),
    map((state) => state === 'SYNCING'),
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
    // this.syncState$.subscribe((v) => console.log(`syncState$`, v));
    this.isSyncInProgress$.subscribe((v) => {
      // console.log('isSyncInProgress$', v);
      if (v) {
        this._globalProgressBarService.countUp('SYNC');
      } else {
        this._globalProgressBarService.countDown();
      }
    });

    this._commonAndLegacySyncConfig$.subscribe(async (cfg) => {
      try {
        this.pf.setActiveSyncProvider(
          cfg.isEnabled ? (cfg.syncProvider as unknown as SyncProviderId) : null,
        );
        if (cfg.isEnabled) {
          this.pf.setEncryptAndCompressCfg({
            isEncrypt: !!cfg.isEncryptionEnabled,
            isCompress: !!cfg.isCompressionEnabled,
          });
        }
      } catch (e) {
        console.error(e);
        alert('Unable to set sync provider. Please check your settings.');
      }
    });
  }

  async importCompleteBackup(
    data: AppDataCompleteNew | CompleteBackup<PfapiAllModelCfg>,
    isSkipLegacyWarnings: boolean = false,
    isSkipReload: boolean = false,
  ): Promise<void> {
    try {
      this._imexViewService.setDataImportInProgress(true);
      if ('crossModelVersion' in data && 'timestamp' in data) {
        await this.pf.importCompleteBackup(data, isSkipLegacyWarnings);
      } else {
        await this.pf.importCompleteBackup(
          {
            data,
            lastUpdate: 1,
            timestamp: 1,
            // NOTE since this is legacy data, we start at 0
            crossModelVersion: 0,
          },
          isSkipLegacyWarnings,
        );
      }

      this._imexViewService.setDataImportInProgress(false);
      if (!isSkipReload) {
        window.location.reload();
      }
    } catch (e) {
      this._imexViewService.setDataImportInProgress(false);
      throw e;
    }
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
