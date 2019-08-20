import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnInit
} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {ProjectService} from './features/project/project.service';
import {ProjectThemeCfg} from './features/project/project.model';
import {ChromeExtensionInterfaceService} from './core/chrome-extension-interface/chrome-extension-interface.service';
import {ShortcutService} from './core-ui/shortcut/shortcut.service';
import {GlobalConfigService} from './features/config/global-config.service';
import {blendInOutAnimation} from './ui/animations/blend-in-out.ani';
import {LayoutService} from './core-ui/layout/layout.service';
import {ElectronService} from 'ngx-electron';
import {IPC} from '../../electron/ipc-events.const';
import {SnackService} from './core/snack/snack.service';
import {BodyClass, IS_ELECTRON} from './app.constants';
import {GoogleDriveSyncService} from './features/google/google-drive-sync.service';
import {SwUpdate} from '@angular/service-worker';
import {BookmarkService} from './features/bookmark/bookmark.service';
import {expandAnimation} from './ui/animations/expand.ani';
import {warpRouteAnimation} from './ui/animations/warp-route';
import {NoteService} from './features/note/note.service';
import {BreakpointObserver} from '@angular/cdk/layout';
import {DOCUMENT} from '@angular/common';
import {filter, map, take} from 'rxjs/operators';
import {MigrateService} from './imex/migrate/migrate.service';
import {combineLatest, Observable} from 'rxjs';
import {selectIsRelatedDataLoadedForCurrentProject} from './features/project/store/project.reducer';
import {Store} from '@ngrx/store';
import {fadeAnimation} from './ui/animations/fade.ani';
import {IS_MAC} from './util/is-mac';
import {selectIsTaskDataLoaded} from './features/tasks/store/task.selectors';
import {isTouch} from './util/is-touch';
import {ThemeService} from 'ng2-charts';
import {BannerService} from './core/banner/banner.service';
import {loadFromLs, saveToLs} from './core/persistence/local-storage';
import {LS_WEB_APP_INSTALL} from './core/persistence/ls-keys.const';
import {BannerId} from './core/banner/banner.model';
import {T} from './t.const';
import {TranslateService} from '@ngx-translate/core';
import {MaterialCssVarsService} from 'angular-material-css-vars';

const SIDE_PANEL_BREAKPOINT = 900;

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
export class AppComponent implements OnInit {
  isAllDataLoadedInitially$: Observable<boolean> = combineLatest([
    this._store.select(selectIsRelatedDataLoadedForCurrentProject),
    this._store.select(selectIsTaskDataLoaded),
  ]).pipe(
    map(([isProjectDataLoaded, isTaskDataLoaded]) => isProjectDataLoaded && isTaskDataLoaded),
    filter(isLoaded => isLoaded),
    take(1),
  );
  isSidePanelBp$: Observable<boolean> = this._breakPointObserver.observe([
    `(max-width: ${SIDE_PANEL_BREAKPOINT}px)`,
  ]).pipe(map(result => result.matches));

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _configService: GlobalConfigService,
    private _shortcutService: ShortcutService,
    private _matIconRegistry: MatIconRegistry,
    private _bannerService: BannerService,
    private _domSanitizer: DomSanitizer,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _migrateService: MigrateService,
    private _swUpdate: SwUpdate,
    private _translateService: TranslateService,
    private _el: ElementRef,
    private _cd: ChangeDetectorRef,
    private _themeService: ThemeService,
    private _breakPointObserver: BreakpointObserver,
    private _store: Store<any>,
    private _materialCssVarsService: MaterialCssVarsService,
    public readonly layoutService: LayoutService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
  ) {
    // TODO we are better than this
    // LOAD GLOBAL MODELS
    this._projectService.load();
    this._configService.load();

    this._matIconRegistry.addSvgIcon(
      `sp`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/sp.svg`)
    );
    this._matIconRegistry.addSvgIcon(
      `play`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/play.svg`)
    );
    this._matIconRegistry.addSvgIcon(
      `github`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/github.svg`)
    );
    this._matIconRegistry.addSvgIcon(
      `jira`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/jira.svg`)
    );
    this._matIconRegistry.addSvgIcon(
      `drag_handle`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/drag-handle.svg`)
    );

    this._migrateService.checkForUpdate();

    // INIT Services and global handlers
    this._initHandlersForInitialBodyClasses();

    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.send(IPC.APP_READY);
      this._initElectronErrorHandler();
      this._initMousewheelZoomForElectron();


      this._electronService.ipcRenderer.on(IPC.TRANSFER_SETTINGS_REQUESTED, () => {
        this._electronService.ipcRenderer.send(IPC.TRANSFER_SETTINGS_TO_ELECTRON, this._configService.cfg);
      });
    } else {
      // WEB VERSION
      this._chromeExtensionInterface.init();
      if (this._swUpdate.isEnabled) {
        this._swUpdate.available.subscribe(() => {
          if (confirm(this._translateService.instant(T.APP.UPDATE_WEB_APP))) {
            window.location.reload();
          }
        });
      }

      window.addEventListener('beforeunload', (e) => {
        if (this._configService.cfg.misc.isConfirmBeforeExit) {
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
  @HostListener('document:dragover', ['$event']) onDragOver(ev: Event) {
    ev.preventDefault();
  }

  @HostListener('document:drop', ['$event']) onDrop(ev: Event) {
    ev.preventDefault();
  }

  @HostListener('document:paste', ['$event']) onPaste(ev: Event) {
    this.bookmarkService.createFromPaste(ev);
  }

  @HostListener('window:beforeinstallprompt', ['$event']) onBeforeInstallPrompt(e: any) {
    if (IS_ELECTRON || loadFromLs(LS_WEB_APP_INSTALL)) {
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
          saveToLs(LS_WEB_APP_INSTALL, true);
        }
      }
    });
  }


  ngOnInit() {
    this._projectService.currentTheme$.subscribe((theme: ProjectThemeCfg) => {
      const isDarkTheme = (IS_ELECTRON && this._electronService.isMacOS)
        ? this._electronService.remote.systemPreferences.isDarkMode()
        : theme.isDarkTheme;

      this._setTheme(theme, isDarkTheme);
    });

    // TODO beautify code here
    if (IS_ELECTRON && this._electronService.isMacOS) {
      this._electronService.remote.systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
        this._projectService.currentTheme$.pipe(take(1)).subscribe(theme => {
          const isDarkTheme = (IS_ELECTRON && this._electronService.isMacOS)
            ? this._electronService.remote.systemPreferences.isDarkMode()
            : theme.isDarkTheme;

          this._setTheme(theme, isDarkTheme);
        });
      });
    }
  }

  getPage(outlet) {
    return outlet.activatedRouteData['page'] || 'one';
  }

  private _initHandlersForInitialBodyClasses() {
    this.document.body.classList.add(BodyClass.isNoAdvancedFeatures);

    if (IS_MAC) {
      this.document.body.classList.add(BodyClass.isMac);
    } else {
      this.document.body.classList.add(BodyClass.isNoMac);
    }

    if (IS_ELECTRON) {
      this.document.body.classList.add(BodyClass.isElectron);
      this.document.body.classList.add(BodyClass.isAdvancedFeatures);
      this.document.body.classList.remove(BodyClass.isNoAdvancedFeatures);
    } else {
      this.document.body.classList.add(BodyClass.isWeb);
      this._chromeExtensionInterface.onReady$.pipe(take(1)).subscribe(() => {
        this.document.body.classList.add(BodyClass.isExtension);
        this.document.body.classList.add(BodyClass.isAdvancedFeatures);
        this.document.body.classList.remove(BodyClass.isNoAdvancedFeatures);
      });
    }

    if (isTouch()) {
      this.document.body.classList.add(BodyClass.isTouchDevice);
    } else {
      this.document.body.classList.add(BodyClass.isNoTouchDevice);
    }
  }

  private _setTheme(theme: ProjectThemeCfg, isDarkTheme: boolean) {
    this._materialCssVarsService.setPrimaryColor(theme.primary);
    this._materialCssVarsService.setAccentColor(theme.accent);
    this._materialCssVarsService.setWarnColor(theme.warn);
    this._materialCssVarsService.setDarkTheme(theme.isDarkTheme);

    if (theme.isReducedTheme) {
      this.document.body.classList.remove(BodyClass.isNoReducedTheme);
      this.document.body.classList.add(BodyClass.isReducedTheme);
    } else {
      this.document.body.classList.remove(BodyClass.isReducedTheme);
      this.document.body.classList.add(BodyClass.isNoReducedTheme);
    }

    this._setChartTheme(isDarkTheme);
  }

  private _setChartTheme(isDarkTheme: boolean) {
    const overrides = (isDarkTheme)
      ? {
        legend: {
          labels: {fontColor: 'white'}
        },
        scales: {
          xAxes: [{
            ticks: {fontColor: 'white'},
            gridLines: {color: 'rgba(255,255,255,0.1)'}
          }],
          yAxes: [{
            ticks: {fontColor: 'white'},
            gridLines: {color: 'rgba(255,255,255,0.1)'}
          }]
        }
      }
      : {};
    this._themeService.setColorschemesOptions(overrides);
  }

  private _initElectronErrorHandler() {
    this._electronService.ipcRenderer.on(IPC.ERROR, (ev, data: {
      error: string,
      stack: any,
    }) => {
      this._snackService.open({
        msg: data.error,
        type: 'ERROR'
      });
      console.error(data);
    });
  }

  private _initMousewheelZoomForElectron() {
    const ZOOM_DELTA = 0.05;
    const webFrame = this._electronService.webFrame;

    if (this._configService.cfg
      && this._configService.cfg._uiHelper
      && this._configService.cfg._uiHelper._zoomFactor > 0) {
      webFrame.setZoomFactor(this._configService.cfg._uiHelper._zoomFactor);
    }

    document.addEventListener('mousewheel', (event: WheelEvent) => {
      if (event && event.ctrlKey) {
        let zoomFactor = webFrame.getZoomFactor();
        if (event.deltaY > 0) {
          zoomFactor -= ZOOM_DELTA;
        } else if (event.deltaY < 0) {
          zoomFactor += ZOOM_DELTA;
        }

        zoomFactor = Math.min(Math.max(zoomFactor, 0.1), 4);

        webFrame.setZoomFactor(zoomFactor);
        this._configService.updateSection('_uiHelper', {
          _zoomFactor: zoomFactor
        });
      }
    }, false);
  }
}
