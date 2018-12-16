import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Inject, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { ProjectService } from './project/project.service';
import { Project } from './project/project.model';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core/shortcut/shortcut.service';
import { ConfigService } from './core/config/config.service';
import { blendInOutAnimation } from './ui/animations/blend-in-out.ani';
import { LayoutService } from './core/layout/layout.service';
import { ElectronService } from 'ngx-electron';
import { IPC_APP_READY, IPC_ERROR, IPC_TRANSFER_SETTINGS_REQUESTED, IPC_TRANSFER_SETTINGS_TO_ELECTRON } from '../ipc-events.const';
import { SnackService } from './core/snack/snack.service';
import { IS_ELECTRON } from './app.constants';
import { GoogleDriveSyncService } from './core/google/google-drive-sync.service';
import { SwUpdate } from '@angular/service-worker';
import { BookmarkService } from './bookmark/bookmark.service';
import { slideAnimation } from './ui/animations/slide.ani';
import { expandAnimation } from './ui/animations/expand.ani';
import { warpRouteAnimation } from './ui/animations/warp-route';
import { NoteService } from './note/note.service';
import { MediaMatcher } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { take } from 'rxjs/operators';
import { MigrateService } from './core/migrate/migrate.service';

const SIDE_PANEL_BREAKPOINT = 900;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [blendInOutAnimation, slideAnimation, expandAnimation, warpRouteAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;
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
    private _media: MediaMatcher,
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
      `drag_handle`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/drag-handle.svg`)
    );

    this._projectService.load();

    this._migrateService.checkForUpdate();

    // INIT Services and global handlers
    this._googleDriveSyncService.init();
    this._chromeExtensionInterface.init();
    this._initHandlersForOtherBodyClasses();

    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.send(IPC_APP_READY);
      this._initElectronErrorHandler();
      this._initMousewheelZoomForElectron();

      this._electronService.ipcRenderer.on(IPC_TRANSFER_SETTINGS_REQUESTED, () => {
        this._electronService.ipcRenderer.send(IPC_TRANSFER_SETTINGS_TO_ELECTRON, this._configService.cfg);
      });
    } else {
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
    this._projectService.currentProject$.subscribe((currentProject: Project) => {
      this._setTheme(currentProject.isDarkTheme, currentProject.themeColor);
    });

    this.mobileQuery = this._media.matchMedia(`(max-width: ${SIDE_PANEL_BREAKPOINT}px)`);
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  getPage(outlet) {
    return outlet.activatedRouteData['page'] || 'one';
  }

  private _initHandlersForOtherBodyClasses() {
    this.document.body.classList.add('isNoJira');

    if (IS_ELECTRON) {
      this.document.body.classList.add('isElectron');
      this.document.body.classList.remove('isNoJira');
    } else {
      this._chromeExtensionInterface.isReady$.pipe(take(1)).subscribe(() => {
        this.document.body.classList.add('isExtension');
        this.document.body.classList.remove('isNoJira');
      });
    }
  }

  private _setTheme(isDarkTheme: boolean, theme: string) {
    if (this._currentTheme) {
      this.document.body.classList.remove(this._currentTheme);
    }
    this.document.body.classList.add(theme);

    if (isDarkTheme) {
      this.document.body.classList.remove('isLightTheme');
      this.document.body.classList.add('isDarkTheme');
    } else {
      this.document.body.classList.remove('isDarkTheme');
      this.document.body.classList.add('isLightTheme');
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
        webFrame.setZoomFactor(zoomFactor);
        this._configService.updateSection('_uiHelper', {
          _zoomFactor: zoomFactor
        });
      }
    }, false);
  }
}
