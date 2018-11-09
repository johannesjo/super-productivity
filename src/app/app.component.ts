import { Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ProjectService } from './project/project.service';
import { Project } from './project/project.model';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';
import { ShortcutService } from './core/shortcut/shortcut.service';
import { checkKeyCombo } from './core/util/check-key-combo';
import { ConfigService } from './core/config/config.service';
import { blendInOutAnimation } from './ui/animations/blend-in-out.ani';
import { LayoutService } from './core/layout/layout.service';
import { ElectronService } from 'ngx-electron';
import { IPC_EVENT_APP_READY, IPC_EVENT_ERROR } from '../ipc-events.const';
import { SnackService } from './core/snack/snack.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [blendInOutAnimation]
})
export class AppComponent implements OnInit {
  @HostBinding('class') private _currentTheme: string;


  constructor(
    private _configService: ConfigService,
    private _shortcutService: ShortcutService,
    private _matIconRegistry: MatIconRegistry,
    private _domSanitizer: DomSanitizer,
    private _overlayContainer: OverlayContainer,
    private _projectService: ProjectService,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
    public layoutService: LayoutService,
  ) {
    this._matIconRegistry.addSvgIcon(
      `sp`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/sp.svg`)
    );

    // INIT Services and global handlers
    this._chromeExtensionInterface.init();
    this._initElectronErrorHandler();
    this._electronService.ipcRenderer.send(IPC_EVENT_APP_READY);
  }

  @HostListener('document:keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._shortcutService.handleKeyDown(ev);
    if (checkKeyCombo(ev, this._configService.cfg.keyboard.addNewTask)) {
      this.layoutService.toggleAddTaskBar();
      ev.preventDefault();
    }
  }

  ngOnInit() {
    this._projectService.currentProject$.subscribe((currentProject: Project) => {
      this._setTheme(currentProject.themeColor + (currentProject.isDarkTheme ? '-dark' : ''));
    });
  }

  private _setTheme(theme) {
    if (this._currentTheme) {
      this._overlayContainer.getContainerElement().classList.remove(this._currentTheme);
    }

    this._overlayContainer.getContainerElement().classList.add(theme);
    this._currentTheme = theme;
  }

  private _initElectronErrorHandler() {
    this._electronService.ipcRenderer.on(IPC_EVENT_ERROR, (ev, data: {
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
