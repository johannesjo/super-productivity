import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Inject,
  ViewChild
} from '@angular/core';
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
import {DOCUMENT} from '@angular/common';
import {filter, map, take} from 'rxjs/operators';
import {combineLatest, Observable} from 'rxjs';
import {Store} from '@ngrx/store';
import {fadeAnimation} from './ui/animations/fade.ani';
import {selectIsTaskDataLoaded} from './features/tasks/store/task.selectors';
import {BannerService} from './core/banner/banner.service';
import {SS_WEB_APP_INSTALL} from './core/persistence/ls-keys.const';
import {BannerId} from './core/banner/banner.model';
import {T} from './t.const';
import {TranslateService} from '@ngx-translate/core';
import {GlobalThemeService} from './core/theme/global-theme.service';
import {UiHelperService} from './features/ui-helper/ui-helper.service';
import {TaskService} from './features/tasks/task.service';
import {observeWidth} from './util/resize-observer-obs';


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
export class AppComponent implements AfterContentInit {
  isAllDataLoadedInitially$: Observable<boolean> = combineLatest([
    this._projectService.isRelatedDataLoadedForCurrentProject$,
    this._store.select(selectIsTaskDataLoaded),
  ]).pipe(
    map(([isProjectDataLoaded, isTaskDataLoaded]) => isProjectDataLoaded && isTaskDataLoaded),
    filter(isLoaded => isLoaded),
    take(1),
  );
  isSmallMainContainer$: Observable<boolean>;
  @ViewChild('routeWrapper', {static: false, read: ElementRef}) routeWrapperElRef: ElementRef;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _configService: GlobalConfigService,
    private _shortcutService: ShortcutService,
    private _bannerService: BannerService,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _swUpdate: SwUpdate,
    private _translateService: TranslateService,
    private _globalThemeService: GlobalThemeService,
    private _uiHelperService: UiHelperService,
    private _store: Store<any>,
    public readonly layoutService: LayoutService,
    public readonly bookmarkService: BookmarkService,
    public readonly taskService: TaskService,
    public projectService: ProjectService,
  ) {
    // try to avoid data-loss
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.log('Persistent store granted');
        } else {
          const msg = this._translateService.instant(T.GLOBAL_SNACK.PERSISTENCE_DISALLOWED);
          console.warn('Persistence not allowed');
          this._snackService.open({msg});
        }
      });
    }

    // TODO we are better than this
    // LOAD GLOBAL MODELS
    this._projectService.load();
    this._configService.load();

    // init theme and body class handlers
    this._globalThemeService.init();

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

  ngAfterContentInit(): void {
    // TODO wait for is all data loaded
    setTimeout(() => {
      this.isSmallMainContainer$ = observeWidth(this.routeWrapperElRef.nativeElement).pipe(map(v => v < 550));
      // bla.subscribe((v) => console.log('bla', v));

    }, 2000);
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


  getPage(outlet) {
    return outlet.activatedRouteData.page || 'one';
  }


  private _initElectronErrorHandler() {
    this._electronService.ipcRenderer.on(IPC.ERROR, (ev, data: {
      error: any,
      stack: any,
      errorStr: string,
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

}
