import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import moment from 'moment';
import {
  AUTO_SWITCH_LNGS,
  LanguageCode,
  LanguageCodeMomentMap,
  RTL_LANGUAGES,
} from '../../app.constants';
import { BehaviorSubject, Observable } from 'rxjs';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { map, startWith } from 'rxjs/operators';
import { DEFAULT_GLOBAL_CONFIG } from 'src/app/features/config/default-global-config.const';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _translateService = inject(TranslateService);
  private _dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);
  private _globalConfigService = inject(GlobalConfigService);

  // I think a better approach is to add a field in every [lang].json file to specify the direction of the language
  private isRTL: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLangRTL: Observable<boolean> = this.isRTL.asObservable();

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
        console.error('Invalid language code', lng);
      } else {
        console.warn('No language code provided');
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
    let firstDayOfWeek = DEFAULT_GLOBAL_CONFIG.misc.firstDayOfWeek;
    this._globalConfigService.misc$
      .pipe(
        map((cfg) => cfg.firstDayOfWeek),
        startWith(1),
      )
      .subscribe((_firstDayOfWeek: number) => {
        // default should be monday, if we have an invalid value for some reason
        firstDayOfWeek =
          _firstDayOfWeek === 0 || _firstDayOfWeek > 0 ? _firstDayOfWeek : 1;
      });
    // overwrites default method to make this configurable
    this._dateAdapter.getFirstDayOfWeek = () => firstDayOfWeek;
  }

  private _setFn(lng: LanguageCode): void {
    const momLng = LanguageCodeMomentMap[lng];

    this.isRTL.next(this._isRTL(lng));
    this._translateService.use(lng);

    moment.locale(momLng);

    this._dateAdapter.setLocale(momLng);
  }

  private _isRTL(lng: LanguageCode): boolean {
    return this.rtlLanguages.indexOf(lng) !== -1;
  }
}
