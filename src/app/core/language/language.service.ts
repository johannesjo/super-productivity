import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {DateTimeAdapter} from 'ng-pick-datetime';
import {DateAdapter} from '@angular/material';
import * as moment from 'moment';
import {AUTO_SWITCH_LNGS, LanguageCode, LanguageCodeMomentMap} from '../../app.constants';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  constructor(
    private _translateService: TranslateService,
    private _dateTimeAdapter: DateTimeAdapter<any>,
    private _dateAdapter: DateAdapter<any>,
  ) {
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

  private _setFn(lng: LanguageCode) {
    const momLng = LanguageCodeMomentMap[lng];
    this._translateService.use(lng);
    moment.locale(momLng);
    this._dateAdapter.setLocale(momLng);
    this._dateTimeAdapter.setLocale(momLng);
  }
}
