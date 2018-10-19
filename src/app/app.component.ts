import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { HostBinding } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ProjectService } from './project/project.service';
import { Project } from './project/project';
import { ChromeExtensionInterfaceService } from './core/chrome-extension-interface/chrome-extension-interface.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @HostBinding('class') private _currentTheme: string;

  constructor(
    private _matIconRegistry: MatIconRegistry,
    private _domSanitizer: DomSanitizer,
    private _overlayContainer: OverlayContainer,
    private _projectService: ProjectService,
    private _chromeExtensionInterface: ChromeExtensionInterfaceService,
  ) {
    this._matIconRegistry.addSvgIcon(
      `sp`,
      this._domSanitizer.bypassSecurityTrustResourceUrl(`assets/icons/sp.svg`)
    );
    this._chromeExtensionInterface.init();
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
}
