import { Injectable, inject, effect, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import {
  AUTO_SWITCH_LNGS,
  LanguageCode,
  LanguageCodeMomentMap,
  RTL_LANGUAGES,
} from '../../app.constants';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { DEFAULT_GLOBAL_CONFIG } from 'src/app/features/config/default-global-config.const';
import { Log } from '../log';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _translateService = inject(TranslateService);
  private _dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);
  private _globalConfigService = inject(GlobalConfigService);

  // I think a better approach is to add a field in every [lang].json file to specify the direction of the language
  private readonly _isRTL = signal<boolean>(false);
  readonly isLangRTL = this._isRTL.asReadonly();

  // Temporary solution for knowing the rtl languages
  private readonly rtlLanguages: LanguageCode[] = RTL_LANGUAGES;

  constructor() {
    this._initMonkeyPatchFirstDayOfWeek();
  }

  setLng(lng: LanguageCode): void {
    if (lng && Object.values(LanguageCode).includes(lng)) {
      this._setFn(lng);
    } else {
      if (lng) {
        Log.err('Invalid language code', lng);
      } else {
        Log.normal('No language code provided');
      }
      this.setFromBrowserLngIfAutoSwitchLng();
    }
  }

  setDefault(lng: LanguageCode): void {
    this._translateService.setDefaultLang(lng);
  }

  setFromBrowserLngIfAutoSwitchLng(): void {
    const browserLng = this._translateService.getBrowserLang() as LanguageCode;
    if (AUTO_SWITCH_LNGS.includes(browserLng)) {
      this._setFn(browserLng);
    }
  }

  private _initMonkeyPatchFirstDayOfWeek(): void {
    // Use effect to reactively update firstDayOfWeek when config changes
    effect(() => {
      const miscConfig = this._globalConfigService.misc();
      const firstDayOfWeek =
        miscConfig?.firstDayOfWeek ?? DEFAULT_GLOBAL_CONFIG.misc.firstDayOfWeek;

      // default should be monday, if we have an invalid value for some reason
      const validFirstDayOfWeek =
        firstDayOfWeek === 0 || firstDayOfWeek > 0 ? firstDayOfWeek : 1;

      // overwrites default method to make this configurable
      this._dateAdapter.getFirstDayOfWeek = () => validFirstDayOfWeek;
    });
  }

  private _setFn(lng: LanguageCode): void {
    const momLng = LanguageCodeMomentMap[lng];

    this._isRTL.set(this._checkIsRTL(lng));
    this._translateService.use(lng);

    this._dateAdapter.setLocale(momLng);
  }

  private _checkIsRTL(lng: LanguageCode): boolean {
    return this.rtlLanguages.indexOf(lng) !== -1;
  }
}
