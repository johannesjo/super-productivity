import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  OnDestroy,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core-ui/shortcut/shortcut.service';
import { GlobalConfigService } from './features/config/global-config.service';
import { LayoutService } from './core-ui/layout/layout.service';
import { IPC } from '../../electron/shared-with-frontend/ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON } from './app.constants';
import { BookmarkService } from './features/bookmark/bookmark.service';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { fadeAnimation } from './ui/animations/fade.ani';
import { BannerService } from './core/banner/banner.service';
import { LS } from './core/persistence/storage-keys.const';
import { BannerId } from './core/banner/banner.model';
import { T } from './t.const';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from './core/theme/global-theme.service';
import { UiHelperService } from './features/ui-helper/ui-helper.service';
import { LanguageService } from './core/language/language.service';
import { WorkContextService } from './features/work-context/work-context.service';
import { ImexMetaService } from './imex/imex-meta/imex-meta.service';
import { AndroidService } from './features/android/android.service';
import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';
import { isOnline$ } from './util/is-online';
import { SyncTriggerService } from './imex/sync/sync-trigger.service';
import { environment } from '../environments/environment';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TrackingReminderService } from './features/tracking-reminder/tracking-reminder.service';
import { first, map, skip, take } from 'rxjs/operators';
import { IS_MOBILE } from './util/is-mobile';
import { FocusModeService } from './features/focus-mode/focus-mode.service';
import { warpAnimation, warpInAnimation } from './ui/animations/warp.ani';
import { GlobalConfigState } from './features/config/global-config.model';

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
})
export class AppComponent implements OnDestroy {
  productivityTipTitle: string = productivityTip && productivityTip[0];
  productivityTipText: string = productivityTip && productivityTip[1];

  @HostBinding('@.disabled') isDisableAnimations = false;

  @ViewChild('notesElRef', { read: ViewContainerRef }) notesElRef?: ViewContainerRef;
  @ViewChild('sideNavElRef', { read: ViewContainerRef }) sideNavElRef?: ViewContainerRef;

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

  private _subs: Subscription = new Subscription();
  private _intervalTimer?: NodeJS.Timeout;

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _shortcutService: ShortcutService,
    private _bannerService: BannerService,
    private _snackService: SnackService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _translateService: TranslateService,
    private _globalThemeService: GlobalThemeService,
    private _uiHelperService: UiHelperService,
    private _languageService: LanguageService,
    private _androidService: AndroidService,
    private _bookmarkService: BookmarkService,
    private _startTrackingReminderService: TrackingReminderService,
    private _activatedRoute: ActivatedRoute,
    public readonly syncTriggerService: SyncTriggerService,
    public readonly imexMetaService: ImexMetaService,
    public readonly workContextService: WorkContextService,
    public readonly layoutService: LayoutService,
    public readonly focusModeService: FocusModeService,
    public readonly globalThemeService: GlobalThemeService,
  ) {
    this._snackService.open({
      ico: 'lightbulb',
      config: {
        duration: 7000,
      },
      msg:
        '<strong>' +
        (window as any).productivityTips[(window as any).randomIndex][0] +
        ':</strong> ' +
        (window as any).productivityTips[(window as any).randomIndex][1],
    });

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

    // init offline banner in lack of a better place for it
    this._initOfflineBanner();

    // basically init
    this._startTrackingReminderService.init();

    this._requestPersistence();
    this._checkAvailableStorage();

    if (IS_ANDROID_WEB_VIEW) {
      this._androidService.init();
    }

    this._globalConfigService.cfg$.pipe(skip(1), take(1)).subscribe((v) => {
      if ((v.sync.syncProvider as any) === 'GoogleDrive') {
        alert(
          'Please note that synchronization wia google drive is removed in this release. You can use the file sync provider as an alternative and configure syncing in the background yourself',
        );
      }
    });

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
        localStorage.removeItem(LS.WEB_APP_ACTIVE_INSTANCE);

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
        if (localStorage.getItem(LS.WEB_APP_ACTIVE_INSTANCE)) {
          // NOTE: translations not ready yet
          const t =
            'You are running multiple instances of Super Productivity (possibly over multiple tabs). This is not recommended and might lead to data loss!!';
          const t2 = 'Please close all other instances, before you continue!';
          // show in two dialogs to be sure the user didn't miss it
          alert(t);
          alert(t2);
        }
        localStorage.setItem(LS.WEB_APP_ACTIVE_INSTANCE, 'true');
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

  @HostListener('document:paste', ['$event'])
  async onPaste(ev: ClipboardEvent): Promise<void> {
    if (
      await this.workContextService.isActiveWorkContextProject$.pipe(first()).toPromise()
    ) {
      this._bookmarkService.createFromPaste(ev);
    }
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
