import { inject, Injectable } from '@angular/core';
import { BodyClass, IS_ELECTRON } from '../../app.constants';
import { IS_MAC } from '../../util/is-mac';
import {
  distinctUntilChanged,
  map,
  skip,
  startWith,
  switchMap,
  take,
} from 'rxjs/operators';
import { IS_TOUCH_ONLY } from '../../util/is-touch-only';
import { MaterialCssVarsService } from 'angular-material-css-vars';
import { DOCUMENT } from '@angular/common';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ChromeExtensionInterfaceService } from '../chrome-extension-interface/chrome-extension-interface.service';
import { ThemeService as NgChartThemeService } from 'ng2-charts';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { WorkContextThemeCfg } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { BehaviorSubject, combineLatest, fromEvent, Observable, of } from 'rxjs';
import { IS_FIREFOX } from '../../util/is-firefox';
import { ImexViewService } from '../../imex/imex-meta/imex-view.service';
import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';
import { ChartConfiguration } from 'chart.js';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../../features/android/android-interface';
import { HttpClient } from '@angular/common/http';
import { LS } from '../persistence/storage-keys.const';

export type DarkModeCfg = 'dark' | 'light' | 'system';

@Injectable({ providedIn: 'root' })
export class GlobalThemeService {
  private document = inject<Document>(DOCUMENT);
  private _materialCssVarsService = inject(MaterialCssVarsService);
  private _workContextService = inject(WorkContextService);
  private _globalConfigService = inject(GlobalConfigService);
  private _matIconRegistry = inject(MatIconRegistry);
  private _domSanitizer = inject(DomSanitizer);
  private _chartThemeService = inject(NgChartThemeService);
  private _chromeExtensionInterfaceService = inject(ChromeExtensionInterfaceService);
  private _imexMetaService = inject(ImexViewService);
  private _http = inject(HttpClient);

  darkMode$ = new BehaviorSubject<DarkModeCfg>(
    (localStorage.getItem(LS.DARK_MODE) as DarkModeCfg) || 'system',
  );

  isDarkTheme$: Observable<boolean> = this.darkMode$.pipe(
    switchMap((darkMode) => {
      switch (darkMode) {
        case 'dark':
          return of(true);
        case 'light':
          return of(false);
        default:
          const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)');
          return fromEvent(darkModePreference, 'change').pipe(
            map((e: any) => e.matches),
            startWith(darkModePreference.matches),
          );
      }
    }),
    distinctUntilChanged(),
  );

  backgroundImg$: Observable<string | null | undefined> = combineLatest([
    this._workContextService.currentTheme$,
    this.isDarkTheme$,
  ]).pipe(
    map(([theme, isDarkMode]) =>
      isDarkMode ? theme.backgroundImageDark : theme.backgroundImageLight,
    ),
    distinctUntilChanged(),
  );

  init(): void {
    // This is here to make web page reloads on non-work-context pages at least usable
    this._setBackgroundGradient(true);
    this._initIcons();
    this._initHandlersForInitialBodyClasses();
    this._initThemeWatchers();
    this.darkMode$
      .pipe(skip(1))
      .subscribe((darkMode) => localStorage.setItem(LS.DARK_MODE, darkMode));
  }

  private _setDarkTheme(isDarkTheme: boolean): void {
    this._materialCssVarsService.setDarkTheme(isDarkTheme);
    this._setChartTheme(isDarkTheme);
    // this._materialCssVarsService.setDarkTheme(true);
    // this._materialCssVarsService.setDarkTheme(false);
  }

  private _setColorTheme(theme: WorkContextThemeCfg): void {
    this._materialCssVarsService.setAutoContrastEnabled(!!theme.isAutoContrast);
    this._setBackgroundGradient(!!theme.isDisableBackgroundGradient);

    // NOTE: setting undefined values does not seem to be a problem so we use !
    if (!theme.isAutoContrast) {
      this._materialCssVarsService.setContrastColorThresholdPrimary(theme.huePrimary!);
      this._materialCssVarsService.setContrastColorThresholdAccent(theme.hueAccent!);
      this._materialCssVarsService.setContrastColorThresholdWarn(theme.hueWarn!);
    }

    this._materialCssVarsService.setPrimaryColor(theme.primary!);
    this._materialCssVarsService.setAccentColor(theme.accent!);
    this._materialCssVarsService.setWarnColor(theme.warn!);
  }

  private _setBackgroundGradient(isDisableBackgroundGradient: boolean): void {
    if (isDisableBackgroundGradient) {
      this.document.body.classList.add(BodyClass.isDisableBackgroundGradient);
      this.document.body.classList.remove(BodyClass.isEnabledBackgroundGradient);
    } else {
      this.document.body.classList.add(BodyClass.isEnabledBackgroundGradient);
      this.document.body.classList.remove(BodyClass.isDisableBackgroundGradient);
    }
  }

  private _initIcons(): void {
    const icons: [string, string][] = [
      ['sp', 'assets/icons/sp.svg'],
      ['play', 'assets/icons/play.svg'],
      ['github', 'assets/icons/github.svg'],
      ['gitlab', 'assets/icons/gitlab.svg'],
      ['jira', 'assets/icons/jira.svg'],
      ['caldav', 'assets/icons/caldav.svg'],
      ['open_project', 'assets/icons/open-project.svg'],
      ['drag_handle', 'assets/icons/drag-handle.svg'],
      ['remove_today', 'assets/icons/remove-today-48px.svg'],
      ['estimate_remaining', 'assets/icons/estimate-remaining.svg'],
      ['working_today', 'assets/icons/working-today.svg'],
      ['repeat', 'assets/icons/repeat.svg'],
      ['gitea', 'assets/icons/gitea.svg'],
      ['redmine', 'assets/icons/redmine.svg'],
      ['calendar', 'assets/icons/calendar.svg'],
      ['early_on', 'assets/icons/early-on.svg'],
      ['tomorrow', 'assets/icons/tomorrow.svg'],
      ['next_week', 'assets/icons/next-week.svg'],
      ['keep', 'assets/icons/keep.svg'],
      ['keep_filled', 'assets/icons/keep-filled.svg'],
    ];

    // todo test if can be removed with airplane mode and wifi without internet
    icons.forEach(([name, path]) => {
      this._matIconRegistry.addSvgIcon(
        name,
        this._domSanitizer.bypassSecurityTrustResourceUrl(path),
      );
    });

    this.preloadIcons(icons);
  }

  preloadIcons(icons: [string, string][]): Promise<void[]> {
    // Map each icon name to a promise that fetches and registers the icon.
    const iconPromises = icons.map(([iconName, url]) => {
      // Construct the URL for the SVG file.
      // Adjust the path if your SVGs are located elsewhere.
      return this._http
        .get(url, { responseType: 'text' })
        .toPromise()
        .then((svg) => {
          // Register the fetched SVG as an inline icon.
          this._matIconRegistry.addSvgIconLiteral(
            iconName,
            this._domSanitizer.bypassSecurityTrustHtml(svg),
          );
        })
        .catch((error) => {
          console.error(`Error loading icon: ${iconName} from ${url}`, error);
        });
    });

    // Return a promise that resolves when all icons have been processed.
    return Promise.all(iconPromises);
  }

  private _initThemeWatchers(): void {
    // init theme watchers
    this._workContextService.currentTheme$.subscribe((theme: WorkContextThemeCfg) =>
      this._setColorTheme(theme),
    );
    this.isDarkTheme$.subscribe((isDarkTheme) => this._setDarkTheme(isDarkTheme));
  }

  private _initHandlersForInitialBodyClasses(): void {
    this.document.body.classList.add(BodyClass.isNoAdvancedFeatures);

    if (!IS_FIREFOX) {
      this.document.body.classList.add(BodyClass.isNoFirefox);
    }

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

    if (IS_ANDROID_WEB_VIEW) {
      androidInterface.isKeyboardShown$.subscribe((isShown) => {
        console.log('isShown', isShown);

        this.document.body.classList.remove(BodyClass.isAndroidKeyboardHidden);
        this.document.body.classList.remove(BodyClass.isAndroidKeyboardShown);
        this.document.body.classList.add(
          isShown ? BodyClass.isAndroidKeyboardShown : BodyClass.isAndroidKeyboardHidden,
        );
      });
    }

    this._globalConfigService.misc$.subscribe((misc) => {
      if (misc.isDisableAnimations) {
        this.document.body.classList.add(BodyClass.isDisableAnimations);
      } else {
        this.document.body.classList.remove(BodyClass.isDisableAnimations);
      }
    });

    this._imexMetaService.isDataImportInProgress$.subscribe((isInProgress) => {
      // timer(1000, 5000)
      //   .pipe(map((val) => val % 2 === 0))
      //   .subscribe((isInProgress) => {
      if (isInProgress) {
        this.document.body.classList.add(BodyClass.isDataImportInProgress);
      } else {
        this.document.body.classList.remove(BodyClass.isDataImportInProgress);
      }
    });

    if (IS_TOUCH_ONLY) {
      this.document.body.classList.add(BodyClass.isTouchOnly);
    } else {
      this.document.body.classList.add(BodyClass.isNoTouchOnly);
    }

    if (IS_MOUSE_PRIMARY) {
      this.document.body.classList.add(BodyClass.isMousePrimary);
    } else if (IS_TOUCH_PRIMARY) {
      this.document.body.classList.add(BodyClass.isTouchPrimary);
    }
  }

  private _setChartTheme(isDarkTheme: boolean): void {
    const overrides: ChartConfiguration['options'] = isDarkTheme
      ? {
          // legend: {
          //   labels: { fontColor: 'white' },
          // },
          scales: {
            x: {
              ticks: {
                color: 'white',
              },
              grid: {
                color: 'rgba(255,255,255,0.1)',
              },
            },

            y: {
              ticks: {
                color: 'white',
              },
              grid: {
                color: 'rgba(255,255,255,0.1)',
              },
            },
          },
        }
      : {
          scales: {},
        };
    this._chartThemeService.setColorschemesOptions(overrides);
  }
}
