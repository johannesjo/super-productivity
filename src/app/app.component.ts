import {ChangeDetectionStrategy, Component, HostListener, Inject} from '@angular/core';
import {ProjectService} from './features/project/project.service';
import {ChromeExtensionInterfaceService} from './core/chrome-extension-interface/chrome-extension-interface.service';
import {ShortcutService} from './core-ui/shortcut/shortcut.service';
import {GlobalConfigService} from './features/config/global-config.service';
import {blendInOutAnimation} from './ui/animations/blend-in-out.ani';
import {LayoutService} from './core-ui/layout/layout.service';
import {ElectronService} from 'ngx-electron';
import {IPC} from '../../electron/ipc-events.const';
import {SnackService} from './core/snack/snack.service';
import {IS_ELECTRON} from './app.constants';
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
import {Store} from '@ngrx/store';
import {fadeAnimation} from './ui/animations/fade.ani';
import {selectIsTaskDataLoaded} from './features/tasks/store/task.selectors';
import {BannerService} from './core/banner/banner.service';
import {loadFromLs, saveToLs} from './core/persistence/local-storage';
import {LS_WEB_APP_INSTALL} from './core/persistence/ls-keys.const';
import {BannerId} from './core/banner/banner.model';
import {T} from './t.const';
import {TranslateService} from '@ngx-translate/core';
import {GlobalThemeService} from './core/theme/global-theme.service';
import {UiHelperService} from './features/ui-helper/ui-helper.service';

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
export class AppComponent {
  isAllDataLoadedInitially$: Observable<boolean> = combineLatest([
    this._projectService.isRelatedDataLoadedForCurrentProject$,
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
    private _bannerService: BannerService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _migrateService: MigrateService,
    private _swUpdate: SwUpdate,
    private _translateService: TranslateService,
    private _globalThemeService: GlobalThemeService,
    private _breakPointObserver: BreakpointObserver,
    private _uiHelperService: UiHelperService,
    private _store: Store<any>,
    public readonly layoutService: LayoutService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
  ) {
    // TODO we are better than this
    // LOAD GLOBAL MODELS
    this._projectService.load();
    this._configService.load();

    // init theme and body class handlers
    this._globalThemeService.init();

    this._migrateService.checkForUpdate();

    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.send(IPC.APP_READY);
      this._initElectronErrorHandler();
      this._uiHelperService.initElectron();


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


  getPage(outlet) {
    return outlet.activatedRouteData.page || 'one';
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

}
