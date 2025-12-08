import { effect, inject, Injectable } from '@angular/core';
import { PersistenceLocalService } from '../persistence/persistence-local.service';
import { PersistenceLegacyService } from '../persistence/persistence-legacy.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { TranslateService } from '@ngx-translate/core';
import { LocalBackupService } from '../../imex/local-backup/local-backup.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { SnackService } from '../snack/snack.service';
import { MatDialog } from '@angular/material/dialog';
import { PluginService } from '../../plugins/plugin.service';
import { SyncWrapperService } from '../../imex/sync/sync-wrapper.service';
import { BannerService } from '../banner/banner.service';
import { UiHelperService } from '../../features/ui-helper/ui-helper.service';
import { ChromeExtensionInterfaceService } from '../chrome-extension-interface/chrome-extension-interface.service';
import { ProjectService } from '../../features/project/project.service';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { IS_ELECTRON } from '../../app.constants';
import { SyncStatus } from '../../pfapi/api';
import { Log } from '../log';
import { download } from '../../util/download';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';
import { T } from '../../t.const';
import { DEFAULT_META_MODEL } from '../../pfapi/api/model-ctrl/meta-model-ctrl';
import { BannerId } from '../banner/banner.model';
import { isOnline$ } from '../../util/is-online';
import { LS } from '../persistence/storage-keys.const';
import { getDbDateStr } from '../../util/get-db-date-str';
import { DialogPleaseRateComponent } from '../../features/dialog-please-rate/dialog-please-rate.component';
import { take } from 'rxjs/operators';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { IPC } from '../../../../electron/shared-with-frontend/ipc-events.const';
import { IpcRendererEvent } from 'electron';
import { environment } from '../../../environments/environment';
import { TrackingReminderService } from '../../features/tracking-reminder/tracking-reminder.service';
import { SyncSafetyBackupService } from '../../imex/sync/sync-safety-backup.service';

const w = window as Window & { productivityTips?: string[][]; randomIndex?: number };

/** Delay before running deferred initialization tasks (plugins, storage checks, etc.) */
const DEFERRED_INIT_DELAY_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private _persistenceLocalService = inject(PersistenceLocalService);
  private _persistenceLegacyService = inject(PersistenceLegacyService);
  private _pfapiService = inject(PfapiService);
  private _imexMetaService = inject(ImexViewService);
  private _translateService = inject(TranslateService);
  private _localBackupService = inject(LocalBackupService);
  private _globalConfigService = inject(GlobalConfigService);
  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);
  private _pluginService = inject(PluginService);
  private _syncWrapperService = inject(SyncWrapperService);
  private _bannerService = inject(BannerService);
  private _uiHelperService = inject(UiHelperService);
  private _chromeExtensionInterfaceService = inject(ChromeExtensionInterfaceService);
  private _projectService = inject(ProjectService);
  private _trackingReminderService = inject(TrackingReminderService);

  constructor() {
    // needs to be injected somewhere to initialize
    inject(SyncSafetyBackupService);

    // Initialize electron error handler in an effect
    if (IS_ELECTRON) {
      effect(() => {
        window.ea.on(IPC.ERROR, (ev: IpcRendererEvent, ...args: unknown[]) => {
          const data = args[0] as {
            error: unknown;
            stack: unknown;
            errorStr: string | unknown;
          };
          const errMsg =
            typeof data.errorStr === 'string' ? data.errorStr : ' INVALID ERROR MSG :( ';

          this._snackService.open({
            msg: errMsg,
            type: 'ERROR',
            isSkipTranslate: true,
          });
          Log.err(data);
        });
      });
    }
  }

  init(): void {
    this._checkMigrationAndInitBackups();
    this._requestPersistence();

    // deferred init
    window.setTimeout(async () => {
      this._trackingReminderService.init();
      this._checkAvailableStorage();
      this._initOfflineBanner();

      const miscCfg = this._globalConfigService.misc();
      if (miscCfg?.isShowProductivityTipLonger && !this._isTourLikelyToBeShown()) {
        if (w.productivityTips && w.randomIndex !== undefined) {
          this._snackService.open({
            ico: 'lightbulb',
            config: {
              duration: 16000,
            },
            msg:
              '<strong>' +
              w.productivityTips[w.randomIndex][0] +
              ':</strong> ' +
              w.productivityTips[w.randomIndex][1],
          });
        }
      }

      this._handleAppStartRating();
      await this._initPlugins();
    }, DEFERRED_INIT_DELAY_MS);

    if (IS_ELECTRON) {
      window.ea.informAboutAppReady();
      this._uiHelperService.initElectron();

      window.ea.on(IPC.TRANSFER_SETTINGS_REQUESTED, () => {
        window.ea.sendAppSettingsToElectron(
          this._globalConfigService.cfg() as GlobalConfigState,
        );
      });
    } else {
      // WEB VERSION
      window.addEventListener('beforeunload', (e) => {
        const gCfg = this._globalConfigService.cfg();
        if (!gCfg) {
          throw new Error();
        }
        if (gCfg.misc.isConfirmBeforeExit) {
          e.preventDefault();
          e.returnValue = '';
        }
      });

      if (!IS_ANDROID_WEB_VIEW) {
        this._chromeExtensionInterfaceService.init();
        this._initMultiInstanceWarning();
      }
    }
  }

  private async _checkMigrationAndInitBackups(): Promise<void> {
    const MIGRATED_VAL = 42;
    const lastLocalSyncModelChange =
      await this._persistenceLocalService.loadLastSyncModelChange();
    // CHECK AND DO MIGRATION
    // ---------------------
    if (
      typeof lastLocalSyncModelChange === 'number' &&
      lastLocalSyncModelChange > MIGRATED_VAL
    ) {
      // disable sync until reload
      this._pfapiService.pf.sync = () => Promise.resolve({ status: SyncStatus.InSync });
      this._imexMetaService.setDataImportInProgress(true);

      const legacyData = await this._persistenceLegacyService.loadComplete();
      Log.log({ legacyData: legacyData });

      alert(this._translateService.instant(T.MIGRATE.DETECTED_LEGACY));

      if (
        !IS_ANDROID_WEB_VIEW &&
        confirm(this._translateService.instant(T.MIGRATE.C_DOWNLOAD_BACKUP))
      ) {
        try {
          await download('sp-legacy-backup.json', JSON.stringify(legacyData));
        } catch (e) {
          Log.error(e);
        }
      }
      try {
        await this._pfapiService.importCompleteBackup(
          legacyData as unknown as AppDataCompleteNew,
          true,
          true,
        );
        this._imexMetaService.setDataImportInProgress(true);
        await this._persistenceLocalService.updateLastSyncModelChange(MIGRATED_VAL);

        alert(this._translateService.instant(T.MIGRATE.SUCCESS));

        if (IS_ELECTRON) {
          window.ea.relaunch();
          // if relaunch fails we hard close the app
          window.setTimeout(() => window.ea.exit(1234), 1000);
        }
        window.location.reload();
        // fallback
        window.setTimeout(
          () => alert(this._translateService.instant(T.MIGRATE.E_RESTART_FAILED)),
          2000,
        );
      } catch (error) {
        // prevent any interaction with the app on after failure
        this._imexMetaService.setDataImportInProgress(true);
        Log.err(error);

        try {
          alert(
            this._translateService.instant(T.MIGRATE.E_MIGRATION_FAILED) +
              '\n\n' +
              JSON.stringify(
                (error as { additionalLog?: Array<{ errors: unknown }> })
                  .additionalLog?.[0]?.errors,
              ),
          );
        } catch (e) {
          alert(
            this._translateService.instant(T.MIGRATE.E_MIGRATION_FAILED) +
              '\n\n' +
              error?.toString(),
          );
        }
        return;
      }
    } else {
      // if everything is normal, check for TMP stray backup
      await this._pfapiService.isCheckForStrayLocalTmpDBBackupAndImport();

      // if completely fresh instance check for local backups
      if (IS_ELECTRON || IS_ANDROID_WEB_VIEW) {
        const meta = await this._pfapiService.pf.metaModel.load();
        if (!meta || meta.lastUpdate === DEFAULT_META_MODEL.lastUpdate) {
          await this._localBackupService.askForFileStoreBackupIfAvailable();
        }
        // trigger backup init after
        this._localBackupService.init();
      }
    }
  }

  private _initMultiInstanceWarning(): void {
    const channel = new BroadcastChannel('superProductivityTab');
    let isOriginal = true;

    enum Msg {
      newTabOpened = 'newTabOpened',
      alreadyOpenElsewhere = 'alreadyOpenElsewhere',
    }

    channel.postMessage(Msg.newTabOpened);
    // note that listener is added after posting the message

    channel.addEventListener('message', (msg) => {
      if (msg.data === Msg.newTabOpened && isOriginal) {
        // message received from 2nd tab
        // reply to all new tabs that the website is already open
        channel.postMessage(Msg.alreadyOpenElsewhere);
      }
      if (msg.data === Msg.alreadyOpenElsewhere) {
        isOriginal = false;
        // message received from original tab
        // replace this with whatever logic you need
        // NOTE: translations not ready yet
        const t =
          'You are running multiple instances of Super Productivity (possibly over multiple tabs). This is not recommended and might lead to data loss!!';
        const t2 = 'Please close all other instances, before you continue!';
        // show in two dialogs to be sure the user didn't miss it
        alert(t);
        alert(t2);
      }
    });
  }

  private _isTourLikelyToBeShown(): boolean {
    if (localStorage.getItem(LS.IS_SKIP_TOUR)) {
      return false;
    }
    const ua = navigator.userAgent;
    if (ua === 'NIGHTWATCH' || ua.includes('PLAYWRIGHT')) {
      return false;
    }
    const projectList = this._projectService.list();
    return !projectList || projectList.length <= 2;
  }

  private _initOfflineBanner(): void {
    isOnline$.subscribe((isOnlineIn) => {
      if (!isOnlineIn) {
        this._bannerService.open({
          id: BannerId.Offline,
          ico: 'cloud_off',
          msg: T.APP.B_OFFLINE,
        });
      } else {
        this._bannerService.dismissAll(BannerId.Offline);
      }
    });
  }

  private _requestPersistence(): void {
    if (navigator.storage) {
      // try to avoid data-loss
      Promise.all([navigator.storage.persisted()])
        .then(([persisted]) => {
          if (!persisted) {
            return navigator.storage.persist().then((granted) => {
              if (granted) {
                Log.log('Persistent store granted');
              }
              // NOTE: we never execute for android web view, because it is always true
              else if (!IS_ANDROID_WEB_VIEW) {
                const msg = T.GLOBAL_SNACK.PERSISTENCE_DISALLOWED;
                Log.warn('Persistence not allowed');
                this._snackService.open({ msg });
              }
            });
          } else {
            Log.log('Persistence already allowed');
            return;
          }
        })
        .catch((e) => {
          Log.log(e);
          const err = e && e.toString ? e.toString() : 'UNKNOWN';
          const msg = T.GLOBAL_SNACK.PERSISTENCE_ERROR;
          this._snackService.open({
            type: 'ERROR',
            msg,
            translateParams: {
              err,
            },
          });
        });
    }
  }

  private _checkAvailableStorage(): void {
    if (environment.production) {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({ usage, quota }) => {
          const u = usage || 0;
          const q = quota || 0;

          const percentUsed = Math.round((u / q) * 100);
          const usageInMib = Math.round(u / (1024 * 1024));
          const quotaInMib = Math.round(q / (1024 * 1024));
          const details = `${usageInMib} out of ${quotaInMib} MiB used (${percentUsed}%)`;
          Log.log(details);
          if (quotaInMib - usageInMib <= 333) {
            alert(
              `There is only very little disk space available (${
                quotaInMib - usageInMib
              }mb). This might affect how the app is running.`,
            );
          }
        });
      }
    }
  }

  private _handleAppStartRating(): void {
    const appStarts = +(localStorage.getItem(LS.APP_START_COUNT) || 0);
    const lastStartDay = localStorage.getItem(LS.APP_START_COUNT_LAST_START_DAY);
    const todayStr = getDbDateStr();
    if (appStarts === 32 || appStarts === 96) {
      this._matDialog.open(DialogPleaseRateComponent);
      localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
    }
    if (lastStartDay !== todayStr) {
      localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
      localStorage.setItem(LS.APP_START_COUNT_LAST_START_DAY, todayStr);
    }
  }

  private async _initPlugins(): Promise<void> {
    // Initialize plugin system
    try {
      // Wait for sync to complete before initializing plugins to avoid DB lock conflicts
      await this._syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$
        .pipe(take(1))
        .toPromise();
      await this._pluginService.initializePlugins();
      Log.log('Plugin system initialized after sync completed');
    } catch (error) {
      Log.err('Failed to initialize plugin system:', error);
    }
  }
}
