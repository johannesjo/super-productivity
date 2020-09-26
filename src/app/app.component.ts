import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core-ui/shortcut/shortcut.service';
import { GlobalConfigService } from './features/config/global-config.service';
import { blendInOutAnimation } from './ui/animations/blend-in-out.ani';
import { LayoutService } from './core-ui/layout/layout.service';
import { IPC } from '../../electron/ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON } from './app.constants';
import { SwUpdate } from '@angular/service-worker';
import { BookmarkService } from './features/bookmark/bookmark.service';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { Subscription } from 'rxjs';
import { fadeAnimation } from './ui/animations/fade.ani';
import { BannerService } from './core/banner/banner.service';
import { SS_WEB_APP_INSTALL } from './core/persistence/ls-keys.const';
import { BannerId } from './core/banner/banner.model';
import { T } from './t.const';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from './core/theme/global-theme.service';
import { UiHelperService } from './features/ui-helper/ui-helper.service';
import { LanguageService } from './core/language/language.service';
import { ElectronService } from './core/electron/electron.service';
import { WorkContextService } from './features/work-context/work-context.service';
import { ImexMetaService } from './imex/imex-meta/imex-meta.service';
import { AndroidService } from './core/android/android.service';
import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';
import { isOnline, isOnline$ } from './util/is-online';
import { InitialDialogService } from './features/initial-dialog/initial-dialog.service';
import { SyncService } from './imex/sync/sync.service';
import { environment } from '../environments/environment';
import { RouterOutlet } from '@angular/router';
import { ipcRenderer } from 'electron';
import { TrackingReminderService } from './features/time-tracking/tracking-reminder/tracking-reminder.service';

const w = window as any;
const productivityTip: string[] = w.productivityTips && w.productivityTips[w.randomIndex];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    blendInOutAnimation,
    expandAnimation,
    warpRouteAnimation,
    fadeAnimation
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnDestroy {
  productivityTipTitle: string = productivityTip && productivityTip[0];
  productivityTipText: string = productivityTip && productivityTip[1];

  @ViewChild('notesElRef', {read: ViewContainerRef}) notesElRef?: ViewContainerRef;
  @ViewChild('sideNavElRef', {read: ViewContainerRef}) sideNavElRef?: ViewContainerRef;

  isRTL: boolean = false;

  private _subs: Subscription = new Subscription();

  constructor(
    private _configService: GlobalConfigService,
    private _shortcutService: ShortcutService,
    private _bannerService: BannerService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _swUpdate: SwUpdate,
    private _translateService: TranslateService,
    private _globalThemeService: GlobalThemeService,
    private _uiHelperService: UiHelperService,
    private _languageService: LanguageService,
    private _androidService: AndroidService,
    private _initialDialogService: InitialDialogService,
    private _bookmarkService: BookmarkService,
    private _startTrackingReminderService: TrackingReminderService,
    public readonly syncService: SyncService,
    public readonly imexMetaService: ImexMetaService,
    public readonly workContextService: WorkContextService,
    public readonly layoutService: LayoutService,
  ) {
    this._subs = this._languageService.isLangRTL.subscribe((val) => {
      this.isRTL = val;
      document.dir = this.isRTL ? 'rtl' : 'ltr';
    });

    // check for dialog
    this._initialDialogService.showDialogIfNecessary$().subscribe();

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

    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.APP_READY);
      this._initElectronErrorHandler();
      this._uiHelperService.initElectron();

      (this._electronService.ipcRenderer as typeof ipcRenderer).on(IPC.TRANSFER_SETTINGS_REQUESTED, () => {
        (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.TRANSFER_SETTINGS_TO_ELECTRON, this._configService.cfg);
      });
    } else {
      // WEB VERSION
      if (this._swUpdate.isEnabled) {
        if (isOnline()) {
          this._swUpdate.checkForUpdate();
        }
        this._swUpdate.available.subscribe(() => {
          if (confirm(this._translateService.instant(T.APP.UPDATE_WEB_APP))) {
            window.location.reload();
          }
        });
      }
      this._chromeExtensionInterfaceService.init();

      window.addEventListener('beforeunload', (e) => {
        const gCfg = this._configService.cfg;
        if (!gCfg) {
          throw new Error();
        }
        if (gCfg.misc.isConfirmBeforeExit) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    }
  }

  @HostListener('document:keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._shortcutService.handleKeyDown(ev);
  }

  // prevent page reloads on missed drops
  @HostListener('document:dragover', ['$event']) onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  @HostListener('document:drop', ['$event']) onDrop(ev: DragEvent) {
    ev.preventDefault();
  }

  @HostListener('document:paste', ['$event']) onPaste(ev: ClipboardEvent) {
    this._bookmarkService.createFromPaste(ev);
  }

  @HostListener('window:beforeinstallprompt', ['$event']) onBeforeInstallPrompt(e: any) {
    if (IS_ELECTRON || sessionStorage.getItem(SS_WEB_APP_INSTALL)) {
      return;
    }

    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    this._bannerService.open({
      id: BannerId.InstallWebApp,
      msg: T.APP.B_INSTALL.MSG,
      action: {
        label: T.APP.B_INSTALL.INSTALL,
        fn: () => {
          e.prompt();
        }
      },
      action2: {
        label: T.APP.B_INSTALL.IGNORE,
        fn: () => {
          sessionStorage.setItem(SS_WEB_APP_INSTALL, 'true');
        }
      }
    });
  }

  getPage(outlet: RouterOutlet) {
    return outlet.activatedRouteData.page || 'one';
  }

  scrollToNotes() {
    (this.notesElRef as ViewContainerRef).element.nativeElement.scrollIntoView({behavior: 'smooth'});
  }

  scrollToSidenav() {
    (this.sideNavElRef as ViewContainerRef).element.nativeElement.scrollIntoView({behavior: 'smooth'});
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private _initElectronErrorHandler() {
    (this._electronService.ipcRenderer as typeof ipcRenderer).on(IPC.ERROR, (ev, data: {
      error: any,
      stack: any,
      errorStr: string | unknown,
    }) => {
      const errMsg = (typeof data.errorStr === 'string')
        ? data.errorStr
        : ' INVALID ERROR MSG :( ';

      this._snackService.open({
        msg: errMsg,
        type: 'ERROR'
      });
      console.error(data);
    });
  }

  private _initOfflineBanner() {
    isOnline$.subscribe((isOnlineIn) => {
      if (!isOnlineIn) {
        this._bannerService.open({
          id: BannerId.Offline,
          ico: 'cloud_off',
          msg: T.APP.B_OFFLINE,
        });
      } else {
        this._bannerService.dismiss(BannerId.Offline);
      }
    });
  }

  private _requestPersistence() {
    if (navigator.storage) {
      // try to avoid data-loss
      Promise.all([
        navigator.storage.persisted(),
      ]).then(([persisted]) => {
        if (!persisted) {
          navigator.storage.persist().then(granted => {
            if (granted) {
              console.log('Persistent store granted');
            } else {
              const msg = T.GLOBAL_SNACK.PERSISTENCE_DISALLOWED;
              console.warn('Persistence not allowed');
              this._snackService.open({msg});
            }
          });
        } else {
          console.log('Persistence already allowed');
        }
      });
    }
  }

  private _checkAvailableStorage() {
    if (environment.production) {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({usage, quota}) => {
          const u = usage || 0;
          const q = quota || 0;

          const percentUsed = Math.round(u / q * 100);
          const usageInMib = Math.round(u / (1024 * 1024));
          const quotaInMib = Math.round(q / (1024 * 1024));
          const details = `${usageInMib} out of ${quotaInMib} MiB used (${percentUsed}%)`;
          console.log(details);
          if ((quotaInMib - usageInMib) <= 333) {
            alert(`There is only very little disk space available (${quotaInMib - usageInMib}mb). This might affect how the app is running.`);
          }
        });
      }
    }
  }
}
