import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateTimeAdapter } from 'ngx-date-time-picker-schedule';
import { DateAdapter } from '@angular/material/core';
import * as moment from 'moment';
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
  // I think a better approach is to add a field in every [lang].json file to specify the direction of the language
  private isRTL: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLangRTL: Observable<boolean> = this.isRTL.asObservable();

  // Temporary solution for knowing the rtl languages
  private readonly rtlLanguages: LanguageCode[] = RTL_LANGUAGES;

  constructor(
    private _translateService: TranslateService,
    private _dateTimeAdapter: DateTimeAdapter<unknown>,
    private _dateAdapter: DateAdapter<unknown>,
    private _globalConfigService: GlobalConfigService,
  ) {
    this._initMonkeyPatchFirstDayOfWeek();
  }

  setLng(lng: LanguageCode) {
    if (lng) {
      this._setFn(lng);
    } else {
      this.setFromBrowserLngIfAutoSwitchLng();
    }
  }

  setDefault(lng: LanguageCode) {
    this._translateService.setDefaultLang(lng);
  }

  setFromBrowserLngIfAutoSwitchLng() {
    const browserLng = this._translateService.getBrowserLang() as LanguageCode;
    if (AUTO_SWITCH_LNGS.includes(browserLng)) {
      this._setFn(browserLng);
    }
  }

  private _initMonkeyPatchFirstDayOfWeek() {
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

  private _setFn(lng: LanguageCode) {
    const momLng = LanguageCodeMomentMap[lng];

    this.isRTL.next(this._isRTL(lng));
    this._translateService.use(lng);

    moment.locale(momLng);

    this._dateAdapter.setLocale(momLng);
    this._dateTimeAdapter.setLocale(momLng);
  }

  private _isRTL(lng: LanguageCode) {
    return this.rtlLanguages.indexOf(lng) !== -1;
  }
}
