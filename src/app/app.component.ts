import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
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

  constructor(
    private _configService: ConfigService,
    private _shortcutService: ShortcutService,
    private _matIconRegistry: MatIconRegistry,
    private _domSanitizer: DomSanitizer,
    private _overlayContainer: OverlayContainer,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
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

    // INIT Services and global handlers
    this._googleDriveSyncService.init();
    this._chromeExtensionInterface.init();
    if (IS_ELECTRON) {
      this._electronService.ipcRenderer.send(IPC_APP_READY);
      this._initElectronErrorHandler();

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

  ngOnInit() {
    this._projectService.currentProject$.subscribe((currentProject: Project) => {
      this._setTheme(currentProject.isDarkTheme, currentProject.themeColor);
    });

    this.mobileQuery = this._media.matchMedia('(max-width: 950px)');
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  getPage(outlet) {
    return outlet.activatedRouteData['page'] || 'one';
  }

  private _setTheme(isDarkTheme: boolean, theme: string) {
    if (this._currentTheme) {
      this._overlayContainer.getContainerElement().classList.remove(this._currentTheme);
      this._el.nativeElement.classList.remove(this._currentTheme);
    }
    this._overlayContainer.getContainerElement().classList.add(theme);
    this._el.nativeElement.classList.add(theme);

    if (isDarkTheme) {
      this._el.nativeElement.classList.remove('isLightTheme');
      this._overlayContainer.getContainerElement().classList.remove('isLightTheme');
      this._el.nativeElement.classList.add('isDarkTheme');
      this._overlayContainer.getContainerElement().classList.add('isDarkTheme');
    } else {
      this._el.nativeElement.classList.remove('isDarkTheme');
      this._overlayContainer.getContainerElement().classList.remove('isDarkTheme');
      this._el.nativeElement.classList.add('isLightTheme');
      this._overlayContainer.getContainerElement().classList.add('isLightTheme');
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
}
