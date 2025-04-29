import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  inject,
  OnDestroy,
} from '@angular/core';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core-ui/shortcut/shortcut.service';
import { GlobalConfigService } from './features/config/global-config.service';
import { LayoutService } from './core-ui/layout/layout.service';
import { IPC } from '../../electron/shared-with-frontend/ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON, LanguageCode } from './app.constants';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { fadeAnimation } from './ui/animations/fade.ani';
import { BannerService } from './core/banner/banner.service';
import { LS } from './core/persistence/storage-keys.const';
import { BannerId } from './core/banner/banner.model';
import { T } from './t.const';
import { GlobalThemeService } from './core/theme/global-theme.service';
import { UiHelperService } from './features/ui-helper/ui-helper.service';
import { LanguageService } from './core/language/language.service';
import { WorkContextService } from './features/work-context/work-context.service';
import { ImexViewService } from './imex/imex-meta/imex-view.service';
import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';
import { isOnline$ } from './util/is-online';
import { SyncTriggerService } from './imex/sync/sync-trigger.service';
import { environment } from '../environments/environment';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TrackingReminderService } from './features/tracking-reminder/tracking-reminder.service';
import { map } from 'rxjs/operators';
import { IS_MOBILE } from './util/is-mobile';
import { warpAnimation, warpInAnimation } from './ui/animations/warp.ani';
import { GlobalConfigState } from './features/config/global-config.model';
import { AddTaskBarComponent } from './features/tasks/add-task-bar/add-task-bar.component';
import { SearchBarComponent } from './features/search-bar/search-bar.component';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { Dir } from '@angular/cdk/bidi';
import { SideNavComponent } from './core-ui/side-nav/side-nav.component';
import { MainHeaderComponent } from './core-ui/main-header/main-header.component';
import { BannerComponent } from './core/banner/banner/banner.component';
import { GlobalProgressBarComponent } from './core-ui/global-progress-bar/global-progress-bar.component';
import { FocusModeOverlayComponent } from './features/focus-mode/focus-mode-overlay/focus-mode-overlay.component';
import { ShepherdComponent } from './features/shepherd/shepherd.component';
import { AsyncPipe } from '@angular/common';
import { selectIsFocusOverlayShown } from './features/focus-mode/store/focus-mode.selectors';
import { Store } from '@ngrx/store';
import { PfapiService } from './pfapi/pfapi.service';
import { PersistenceLegacyService } from './core/persistence/persistence-legacy.service';
import { download } from './util/download';
import { PersistenceLocalService } from './core/persistence/persistence-local.service';
import { SyncStatus } from './pfapi/api';
import { LocalBackupService } from './imex/local-backup/local-backup.service';
import { DEFAULT_META_MODEL } from './pfapi/api/model-ctrl/meta-model-ctrl';
import { AppDataCompleteNew } from './pfapi/pfapi-config';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogPleaseRateComponent } from './features/dialog-please-rate/dialog-please-rate.component';
import { getWorklogStr } from './util/get-work-log-str';

const w = window as any;
const productivityTip: string[] = w.productivityTips && w.productivityTips[w.randomIndex];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    expandAnimation,
    warpRouteAnimation,
    fadeAnimation,
    warpAnimation,
    warpInAnimation,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AddTaskBarComponent,
    SearchBarComponent,
    MatSidenavContainer,
    Dir,
    MatSidenav,
    SideNavComponent,
    MatSidenavContent,
    MainHeaderComponent,
    BannerComponent,
    RouterOutlet,
    GlobalProgressBarComponent,
    FocusModeOverlayComponent,
    ShepherdComponent,
    AsyncPipe,
  ],
})
export class AppComponent implements OnDestroy {
  private _translateService = inject(TranslateService);
  private _globalConfigService = inject(GlobalConfigService);
  private _shortcutService = inject(ShortcutService);
  private _bannerService = inject(BannerService);
  private _snackService = inject(SnackService);
  private _chromeExtensionInterfaceService = inject(ChromeExtensionInterfaceService);
  private _globalThemeService = inject(GlobalThemeService);
  private _uiHelperService = inject(UiHelperService);
  private _languageService = inject(LanguageService);
  private _startTrackingReminderService = inject(TrackingReminderService);
  private _activatedRoute = inject(ActivatedRoute);
  private _pfapiService = inject(PfapiService);
  private _persistenceLegacyService = inject(PersistenceLegacyService);
  private _persistenceLocalService = inject(PersistenceLocalService);
  private _localBackupService = inject(LocalBackupService);
  private _matDialog = inject(MatDialog);

  readonly syncTriggerService = inject(SyncTriggerService);
  readonly imexMetaService = inject(ImexViewService);
  readonly workContextService = inject(WorkContextService);
  readonly layoutService = inject(LayoutService);
  readonly globalThemeService = inject(GlobalThemeService);
  readonly _store = inject(Store);

  productivityTipTitle: string = productivityTip && productivityTip[0];
  productivityTipText: string = productivityTip && productivityTip[1];

  @HostBinding('@.disabled') isDisableAnimations = false;

  isRTL: boolean = false;

  isShowUi$: Observable<boolean> = combineLatest([
    this.syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$,
    this.imexMetaService.isDataImportInProgress$,
  ]).pipe(
    map(
      ([afterInitialIsReady, isDataImportInProgress]) =>
        afterInitialIsReady && !isDataImportInProgress,
    ),
  );

  isShowFocusOverlay$: Observable<boolean> = this._store.select(
    selectIsFocusOverlayShown,
  );

  private _subs: Subscription = new Subscription();
  private _intervalTimer?: NodeJS.Timeout;

  constructor() {
    this._languageService.setDefault(LanguageCode.en);
    this._languageService.setFromBrowserLngIfAutoSwitchLng();

    this._checkMigrationAndInitBackups();

    this._subs = this._languageService.isLangRTL.subscribe((val) => {
      this.isRTL = val;
      document.dir = this.isRTL ? 'rtl' : 'ltr';
    });

    this._subs.add(
      this._activatedRoute.queryParams.subscribe((params) => {
        if (!!params.focusItem) {
          this._focusElement(params.focusItem);
        }
      }),
    );
    this._subs.add(
      this._globalConfigService.misc$.subscribe((misc) => {
        this.isDisableAnimations = misc.isDisableAnimations;
      }),
    );

    // init theme and body class handlers
    this._globalThemeService.init();

    // basically init
    this._requestPersistence();

    // deferred init
    window.setTimeout(() => {
      this._startTrackingReminderService.init();
      this._checkAvailableStorage();
      // init offline banner in lack of a better place for it
      this._initOfflineBanner();

      if (this._globalConfigService.cfg?.misc.isShowTipLonger) {
        this._snackService.open({
          ico: 'lightbulb',
          config: {
            duration: 16000,
          },
          msg:
            '<strong>' +
            (window as any).productivityTips[(window as any).randomIndex][0] +
            ':</strong> ' +
            (window as any).productivityTips[(window as any).randomIndex][1],
        });
      }

      const appStarts = +(localStorage.getItem(LS.APP_START_COUNT) || 0);
      const lastStartDay = localStorage.getItem(LS.APP_START_COUNT_LAST_START_DAY);
      const todayStr = getWorklogStr();
      if (appStarts === 32 || appStarts === 96) {
        this._matDialog.open(DialogPleaseRateComponent);
        localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
      }
      if (lastStartDay !== todayStr) {
        localStorage.setItem(LS.APP_START_COUNT, (appStarts + 1).toString());
        localStorage.setItem(LS.APP_START_COUNT_LAST_START_DAY, todayStr);
      }
    }, 1000);

    if (IS_ELECTRON) {
      window.ea.informAboutAppReady();
      this._initElectronErrorHandler();
      this._uiHelperService.initElectron();

      window.ea.on(IPC.TRANSFER_SETTINGS_REQUESTED, () => {
        window.ea.sendAppSettingsToElectron(
          this._globalConfigService.cfg as GlobalConfigState,
        );
      });
    } else {
      // WEB VERSION
      window.addEventListener('beforeunload', (e) => {
        const gCfg = this._globalConfigService.cfg;
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

  @HostListener('document:keydown', ['$event']) onKeyDown(ev: KeyboardEvent): void {
    this._shortcutService.handleKeyDown(ev);
  }

  // prevent page reloads on missed drops
  @HostListener('document:dragover', ['$event']) onDragOver(ev: DragEvent): void {
    ev.preventDefault();
  }

  @HostListener('document:drop', ['$event']) onDrop(ev: DragEvent): void {
    ev.preventDefault();
  }

  @HostListener('window:beforeinstallprompt', ['$event']) onBeforeInstallPrompt(
    e: any,
  ): void {
    if (IS_ELECTRON || localStorage.getItem(LS.WEB_APP_INSTALL)) {
      return;
    }

    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    window.setTimeout(
      () => {
        this._bannerService.open({
          id: BannerId.InstallWebApp,
          msg: T.APP.B_INSTALL.MSG,
          action: {
            label: T.APP.B_INSTALL.INSTALL,
            fn: () => {
              e.prompt();
            },
          },
          action2: {
            label: T.APP.B_INSTALL.IGNORE,
            fn: () => {
              localStorage.setItem(LS.WEB_APP_INSTALL, 'true');
            },
          },
        });
      },
      2 * 60 * 1000,
    );
  }

  getPage(outlet: RouterOutlet): string {
    return outlet.activatedRouteData.page || 'one';
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
    if (this._intervalTimer) clearInterval(this._intervalTimer);
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
      this.imexMetaService.setDataImportInProgress(true);

      const legacyData = await this._persistenceLegacyService.loadComplete();
      console.log({ legacyData: legacyData });

      alert(this._translateService.instant(T.MIGRATE.DETECTED_LEGACY));

      if (
        !IS_ANDROID_WEB_VIEW &&
        confirm(this._translateService.instant(T.MIGRATE.C_DOWNLOAD_BACKUP))
      ) {
        download('sp-legacy-backup.json', JSON.stringify(legacyData));
      }
      try {
        await this._pfapiService.importCompleteBackup(
          legacyData as any as AppDataCompleteNew,
          true,
          true,
        );
        this.imexMetaService.setDataImportInProgress(true);
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
        this.imexMetaService.setDataImportInProgress(true);
        console.error(error);

        try {
          alert(
            this._translateService.instant(T.MIGRATE.E_MIGRATION_FAILED) +
              '\n\n' +
              JSON.stringify((error as any).additionalLog[0].errors),
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

  private _initElectronErrorHandler(): void {
    window.ea.on(
      IPC.ERROR,
      (
        ev,
        data: {
          error: any;
          stack: any;
          errorStr: string | unknown;
        },
      ) => {
        const errMsg =
          typeof data.errorStr === 'string' ? data.errorStr : ' INVALID ERROR MSG :( ';

        this._snackService.open({
          msg: errMsg,
          type: 'ERROR',
        });
        console.error(data);
      },
    );
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
        .then(([persisted]): any => {
          if (!persisted) {
            return navigator.storage.persist().then((granted) => {
              if (granted) {
                console.log('Persistent store granted');
              }
              // NOTE: we never execute for android web view, because it is always true
              else if (!IS_ANDROID_WEB_VIEW) {
                const msg = T.GLOBAL_SNACK.PERSISTENCE_DISALLOWED;
                console.warn('Persistence not allowed');
                this._snackService.open({ msg });
              }
            });
          } else {
            console.log('Persistence already allowed');
          }
        })
        .catch((e) => {
          console.log(e);
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
          console.log(details);
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

  /**
   * since page load and animation time are not always equal
   * an interval seemed to feel the most responsive
   */
  private _focusElement(id: string): void {
    let counter = 0;
    this._intervalTimer = setInterval(() => {
      counter += 1;

      const el = document.getElementById(`t-${id}`);
      el?.focus();

      if (el && IS_MOBILE) {
        el.classList.add('mobile-highlight');
        el.addEventListener('blur', () => el.classList.remove('mobile-highlight'));
      }

      if ((el || counter === 4) && this._intervalTimer) {
        clearInterval(this._intervalTimer);
      }
    }, 400);
  }
}
