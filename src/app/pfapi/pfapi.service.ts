import { inject, Injectable } from '@angular/core';
import { CompleteBackup, ModelCfgToModelCtrl, Pfapi, SyncProviderId } from './api';
import { from, merge, of, Subject } from 'rxjs';
import { AllowedDBKeys, LS } from '../core/persistence/storage-keys.const';
import { isValidAppData } from '../imex/sync/is-valid-app-data.util';
import { devError } from '../util/dev-error';
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
import { delay, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { fromPfapiEvent } from './pfapi-helper';

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  private _translateService = inject(TranslateService);
  private _imexViewService = inject(ImexViewService);
  private _store = inject(Store);

  public readonly pf = new Pfapi(PFAPI_MODEL_CFGS, PFAPI_SYNC_PROVIDERS, PFAPI_CFG);
  public readonly m: ModelCfgToModelCtrl<PfapiAllModelCfg> = this.pf.m;

  public readonly isSyncProviderEnabledAndReady$ = fromPfapiEvent(
    this.pf.ev,
    'providerReady',
  ).pipe(shareReplay(1), distinctUntilChanged());

  // TODO add helper for fromPfapiEventWithInitial
  // TODO needs to contain all the credentials ideally
  public readonly currentProviderPrivateCfg$ = merge(
    fromPfapiEvent(this.pf.ev, 'providerPrivateCfgChange'),
    of(null).pipe(
      delay(2000),
      switchMap(() => {
        const activeProvider = this.pf.getActiveSyncProvider();
        if (activeProvider) {
          return from(activeProvider.privateCfg.load()).pipe(
            map((d) => ({
              privateCfg: d,
              providerId: activeProvider.id,
            })),
          );
        }
        return of(null);
      }),
    ),
  ).pipe(shareReplay(1));

  public readonly isCurrentProviderInSync$ = merge(
    fromPfapiEvent(this.pf.ev, 'metaModelChange'),
    // delay initial check
    of(null).pipe(
      delay(2000),
      switchMap(() => from(this.pf.metaModel.loadMetaModel())),
    ),
  ).pipe(map((d) => !!d.lastSyncedUpdate && d.lastSyncedUpdate === d.lastUpdate));

  private readonly _commonAndLegacySyncConfig$ = this._store.select(selectSyncConfig);

  // TODO replace with pfapi event
  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isUpdateRevAndLastUpdate: boolean;
    projectId?: string;
  }> = new Subject();

  private _invalidDataCount = 0;

  getAllSyncModelData = this.pf.getAllSyncModelData.bind(this.pf);
  importAllSycModelData = this.pf.importAllSycModelData.bind(this.pf);
  isValidateComplete = this.pf.isValidateComplete.bind(this.pf);
  repairCompleteData = this.pf.repairCompleteData.bind(this.pf);
  getCompleteBackup = this.pf.loadCompleteBackup.bind(this.pf);
  setPrivateCfgForActiveProvider = this.pf.setPrivateCfgForSyncProvider.bind(this.pf);

  constructor() {
    this._isCheckForStrayLocalDBBackupAndImport();
    this.isSyncProviderEnabledAndReady$.subscribe((v) =>
      console.log(`isSyncProviderEnabledAndReady$`, v),
    );

    this.isCurrentProviderInSync$.subscribe((v) =>
      console.log(`isCurrentProviderInSync$`, v),
    );

    this._commonAndLegacySyncConfig$.subscribe((cfg) => {
      // TODO handle android webdav
      this.pf.setActiveSyncProvider(cfg.syncProvider as unknown as SyncProviderId);
      // TODO re-implement
      // if (
      //   providerId === this._localFileSyncAndroidService &&
      //   !androidInterface.isGrantedFilePermission()
      // ) {
      //   if (androidInterface.isGrantFilePermissionInProgress) {
      //     return 'USER_ABORT';
      //   }
      //   const res = await this._openPermissionDialog$().toPromise();
      //   if (res === 'DISABLED_SYNC') {
      //     return 'USER_ABORT';
      //   }
      // }

      // TODO better place
      // console.log('_______________________', { v });
      // this.syncCfg$.pipe(take(1)).subscribe((syncCfg) => {
      //   console.log({ syncCfg });
      //   // this._pfapiWrapperService.pf.setPrivateCfgForActiveProvider(
      //   //   v as unknown as SyncProviderId,
      //   // );
      //   // @ts-ignore
      //   if (syncCfg.syncProvider === SyncProviderId.WebDAV) {
      //     if (syncCfg.webDav) {
      //       this._pfapiWrapperService.pf.setPrivateCfgForActiveProvider({
      //         ...syncCfg.webDav,
      //       });
      //     }
      //   }
      // });
      // this._persistenceLocalService.load().then((d) => {});
    });
  }

  async importCompleteBackup(
    data: AppDataCompleteNew | CompleteBackup<PfapiAllModelCfg>,
  ): Promise<void> {
    try {
      this._imexViewService.setDataImportInProgress(true);
      await ('crossModelVersion' in data && 'timestamp' in data
        ? this.pf.importCompleteBackup(data)
        : this.pf.importCompleteBackup({
            data,
            crossModelVersion: CROSS_MODEL_VERSION,
            lastUpdate: 1,
            modelVersions: {},
            timestamp: 1,
          }));
      this._imexViewService.setDataImportInProgress(false);
    } catch (e) {
      console.log(e);
      alert('importCompleteBackup error');
      this._imexViewService.setDataImportInProgress(false);
      throw e;
    }
  }

  private async _isCheckForStrayLocalDBBackupAndImport(): Promise<boolean> {
    const backup = await this.pf.tmpBackupService.load();
    if (!localStorage.getItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP)) {
      if (backup) {
        await this.pf.tmpBackupService.clear();
      }
      localStorage.setItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP, 'true');
    }
    if (backup) {
      if (confirm(this._translateService.instant(T.CONFIRM.RESTORE_STRAY_BACKUP))) {
        await this.importAllSycModelData({
          data: backup,
          crossModelVersion: CROSS_MODEL_VERSION,
          isBackupData: false,
          isAttemptRepair: false,
        });
        return true;
      } else {
        if (confirm(this._translateService.instant(T.CONFIRM.DELETE_STRAY_BACKUP))) {
          await this.pf.tmpBackupService.clear();
        }
      }
    }
    return false;
  }

  // TODO remove this later, since it only needed for legacy sync
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
}
