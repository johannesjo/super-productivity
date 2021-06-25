import { Inject, Injectable } from '@angular/core';
import { BodyClass, IS_ELECTRON } from '../../app.constants';
import { IS_MAC } from '../../util/is-mac';
import { distinctUntilChanged, map, take } from 'rxjs/operators';
import { isTouchOnly } from '../../util/is-touch';
import { MaterialCssVarsService } from 'angular-material-css-vars';
import { DOCUMENT } from '@angular/common';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ChromeExtensionInterfaceService } from '../chrome-extension-interface/chrome-extension-interface.service';
import { ThemeService as NgChartThemeService } from 'ng2-charts';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { ElectronService } from '../electron/electron.service';
import { WorkContextThemeCfg } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { combineLatest, Observable } from 'rxjs';
import { remote } from 'electron';

@Injectable({ providedIn: 'root' })
export class GlobalThemeService {
  isDarkTheme$: Observable<boolean> =
    IS_ELECTRON && this._electronService.isMacOS
      ? new Observable((subscriber) => {
          subscriber.next(
            (this._electronService.remote as typeof remote).nativeTheme
              .shouldUseDarkColors,
          );
          (
            this._electronService.remote as typeof remote
          ).systemPreferences.subscribeNotification(
            'AppleInterfaceThemeChangedNotification',
            () =>
              subscriber.next(
                (this._electronService.remote as typeof remote).nativeTheme
                  .shouldUseDarkColors,
              ),
          );
        })
      : this._globalConfigService.misc$.pipe(
          map((cfg) => cfg.isDarkMode),
          distinctUntilChanged(),
        );

  backgroundImg$: Observable<string | null> = combineLatest([
    this._workContextService.currentTheme$,
    this.isDarkTheme$,
  ]).pipe(
    map(([theme, isDarkMode]) =>
      isDarkMode ? theme.backgroundImageDark : theme.backgroundImageLight,
    ),
    distinctUntilChanged(),
  );

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private _materialCssVarsService: MaterialCssVarsService,
    private _electronService: ElectronService,
    private _workContextService: WorkContextService,
    private _globalConfigService: GlobalConfigService,
    private _matIconRegistry: MatIconRegistry,
    private _domSanitizer: DomSanitizer,
    private _chartThemeService: NgChartThemeService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
  ) {}

  init() {
    // This is here to make web page reloads on non work context pages at least usable
    this._setBackgroundGradient(true);
    this._initIcons();
    this._initHandlersForInitialBodyClasses();
    this._initThemeWatchers();
  }

  private _setDarkTheme(isDarkTheme: boolean) {
    this._materialCssVarsService.setDarkTheme(isDarkTheme);
    this._setChartTheme(isDarkTheme);
    // this._materialCssVarsService.setDarkTheme(true);
    // this._materialCssVarsService.setDarkTheme(false);
  }

  private _setColorTheme(theme: WorkContextThemeCfg) {
    this._materialCssVarsService.setAutoContrastEnabled(theme.isAutoContrast);
    this._setBackgroundGradient(theme.isDisableBackgroundGradient);

    if (!theme.isAutoContrast) {
      this._materialCssVarsService.setContrastColorThresholdPrimary(theme.huePrimary);
      this._materialCssVarsService.setContrastColorThresholdAccent(theme.hueAccent);
      this._materialCssVarsService.setContrastColorThresholdWarn(theme.hueWarn);
    }

    this._materialCssVarsService.setPrimaryColor(theme.primary);
    this._materialCssVarsService.setAccentColor(theme.accent);
    this._materialCssVarsService.setWarnColor(theme.warn);
  }

  private _setBackgroundGradient(isDisableBackgroundGradient: boolean) {
    if (isDisableBackgroundGradient) {
      this.document.body.classList.add(BodyClass.isDisableBackgroundGradient);
      this.document.body.classList.remove(BodyClass.isEnabledBackgroundGradient);
    } else {
      this.document.body.classList.add(BodyClass.isEnabledBackgroundGradient);
      this.document.body.classList.remove(BodyClass.isDisableBackgroundGradient);
    }
  }

  private _initIcons() {
    const icons = [
      ['sp', 'assets/icons/sp.svg'],
      ['play', 'assets/icons/play.svg'],
      ['github', 'assets/icons/github.svg'],
      ['gitlab', 'assets/icons/gitlab.svg'],
      ['jira', 'assets/icons/jira.svg'],
      ['caldav', 'assets/icons/caldav.svg'],
      ['drag_handle', 'assets/icons/drag-handle.svg'],
      ['remove_today', 'assets/icons/remove-today-48px.svg'],
      ['estimate_remaining', 'assets/icons/estimate-remaining.svg'],
      ['working_today', 'assets/icons/working-today.svg'],
      ['repeat', 'assets/icons/repeat.svg'],
    ];

    icons.forEach(([name, path]) => {
      this._matIconRegistry.addSvgIcon(
        name,
        this._domSanitizer.bypassSecurityTrustResourceUrl(path),
      );
    });
  }

  private _initThemeWatchers() {
    // init theme watchers
    this._workContextService.currentTheme$.subscribe((theme: WorkContextThemeCfg) =>
      this._setColorTheme(theme),
    );
    this.isDarkTheme$.subscribe((isDarkTheme) => this._setDarkTheme(isDarkTheme));
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
      this._chromeExtensionInterfaceService.onReady$.pipe(take(1)).subscribe(() => {
        this.document.body.classList.add(BodyClass.isExtension);
        this.document.body.classList.add(BodyClass.isAdvancedFeatures);
        this.document.body.classList.remove(BodyClass.isNoAdvancedFeatures);
      });
    }

    if (isTouchOnly()) {
      this.document.body.classList.add(BodyClass.isTouchOnly);
    } else {
      this.document.body.classList.add(BodyClass.isNoTouchOnly);
    }
  }

  private _setChartTheme(isDarkTheme: boolean) {
    const overrides = isDarkTheme
      ? {
          legend: {
            labels: { fontColor: 'white' },
          },
          scales: {
            xAxes: [
              {
                ticks: { fontColor: 'white' },
                gridLines: { color: 'rgba(255,255,255,0.1)' },
              },
            ],
            yAxes: [
              {
                ticks: { fontColor: 'white' },
                gridLines: { color: 'rgba(255,255,255,0.1)' },
              },
            ],
          },
        }
      : {};
    this._chartThemeService.setColorschemesOptions(overrides);
  }
}
