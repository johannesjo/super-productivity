import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnInit
} from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { ProjectService } from './features/project/project.service';
import { Project } from './features/project/project.model';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core-ui/shortcut/shortcut.service';
import { ConfigService } from './features/config/config.service';
import { blendInOutAnimation } from './ui/animations/blend-in-out.ani';
import { LayoutService } from './core-ui/layout/layout.service';
import { ElectronService } from 'ngx-electron';
import {
  IPC_APP_READY,
  IPC_ERROR,
  IPC_TRANSFER_SETTINGS_REQUESTED,
  IPC_TRANSFER_SETTINGS_TO_ELECTRON
} from '../../electron/ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON } from './app.constants';
import { GoogleDriveSyncService } from './features/google/google-drive-sync.service';
import { SwUpdate } from '@angular/service-worker';
import { BookmarkService } from './features/bookmark/bookmark.service';
import { slideAnimation } from './ui/animations/slide.ani';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { NoteService } from './features/note/note.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { map, take } from 'rxjs/operators';
import { MigrateService } from './imex/migrate/migrate.service';
import { combineLatest, Observable } from 'rxjs';
import { selectIsAllProjectDataLoaded } from './features/project/store/project.reducer';
import { Store } from '@ngrx/store';
import { fadeAnimation } from './ui/animations/fade.ani';
import { IS_MAC } from './util/is-mac';
import { selectIsTaskDataLoaded } from './features/tasks/store/task.selectors';
import { isTouch } from './util/is-touch';

const SIDE_PANEL_BREAKPOINT = 900;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    blendInOutAnimation,
    slideAnimation,
    expandAnimation,
    warpRouteAnimation,
    fadeAnimation
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  isAllDataLoaded$: Observable<boolean> = combineLatest(
    this._store.select(selectIsAllProjectDataLoaded),
    this._store.select(selectIsTaskDataLoaded),
  ).pipe(map(([isProjectDataLoaded, isTaskDataLoaded]) => isProjectDataLoaded && isTaskDataLoaded));
  isSidePanelBp$: Observable<boolean> = this._breakPointObserver.observe([
    `(max-width: ${SIDE_PANEL_BREAKPOINT}px)`,
  ]).pipe(map(result => result.matches));

  private _currentTheme: string;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _configService: ConfigService,
    private _shortcutService: ShortcutService,
    private _matIconRegistry: MatIconRegistry,
    private _domSanitizer: DomSanitizer,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    private _migrateService: MigrateService,
    private _swUpdate: SwUpdate,
    private _el: ElementRef,
    private _cd: ChangeDetectorRef,
    private _breakPointObserver: BreakpointObserver,
    private _store: Store<any>,
    public readonly layoutService: LayoutService,
    public readonly bookmarkService: BookmarkService,
    public readonly noteService: NoteService,
  ) {
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

    this._projectService.load();

    this._migrateService.checkForUpdate();

    // INIT Services and global handlers
    this._initHandlersForOtherBodyClasses();

    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.send(IPC_APP_READY);
      this._initElectronErrorHandler();
      this._initMousewheelZoomForElectron();


      this._electronService.ipcRenderer.on(IPC_TRANSFER_SETTINGS_REQUESTED, () => {
        this._electronService.ipcRenderer.send(IPC_TRANSFER_SETTINGS_TO_ELECTRON, this._configService.cfg);
      });
    } else {
      // WEB VERSION
      this._chromeExtensionInterface.init();
      if (this._swUpdate.isEnabled) {
        this._swUpdate.available.subscribe(() => {
          if (confirm('New version available. Load New Version?')) {
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

  ngOnInit() {
    this._projectService.currentProject$.subscribe((cp: Project) => {
      this._setTheme(cp.themeColor, cp.isDarkTheme, cp.isReducedTheme);
    });
  }

  getPage(outlet) {
    return outlet.activatedRouteData['page'] || 'one';
  }

  private _initHandlersForOtherBodyClasses() {
    this.document.body.classList.add('isNoJira');

    if (IS_MAC) {
      this.document.body.classList.add('isMac');
    } else {
      this.document.body.classList.add('isNoMac');
    }

    if (IS_ELECTRON) {
      this.document.body.classList.add('isElectron');
      this.document.body.classList.remove('isNoJira');
    } else {
      this._chromeExtensionInterface.isReady$.pipe(take(1)).subscribe(() => {
        this.document.body.classList.add('isExtension');
        this.document.body.classList.remove('isNoJira');
      });
    }

    if (isTouch()) {
      this.document.body.classList.add('isTouchDevice');
    } else {
      this.document.body.classList.add('isNoTouchDevice');
    }
  }

  private _setTheme(theme: string, isDarkTheme: boolean, isReducedTheme: boolean) {
    if (this._currentTheme) {
      this.document.body.classList.remove(this._currentTheme);
    }
    if (theme) {
      this.document.body.classList.add(theme);
    }

    if (isDarkTheme) {
      this.document.body.classList.remove('isLightTheme');
      this.document.body.classList.add('isDarkTheme');
    } else {
      this.document.body.classList.remove('isDarkTheme');
      this.document.body.classList.add('isLightTheme');
    }

    if (isReducedTheme) {
      this.document.body.classList.remove('isNoReducedTheme');
      this.document.body.classList.add('isReducedTheme');
    } else {
      this.document.body.classList.remove('isReducedTheme');
      this.document.body.classList.add('isNoReducedTheme');
    }

    this._currentTheme = theme;
  }

  private _initElectronErrorHandler() {
    this._electronService.ipcRenderer.on(IPC_ERROR, (ev, data: {
      error: string,
      stack: any,
    }) => {
      this._snackService.open({
        message: data.error,
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

    document.addEventListener('mousewheel', (event: MouseWheelEvent) => {
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
