import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {DateTimeAdapter} from 'ng-pick-datetime';
import {DateAdapter} from '@angular/material';
import * as moment from 'moment';
import {AUTO_SWITCH_LNGS, LanguageCode, LanguageCodeMomentMap} from '../../app.constants';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  // Temporary solution for knowing the rtl languages
  rtlLanguages: LanguageCode[] = [LanguageCode.ar];
  // I think a better approach is to add a field in every [lang].json file to specify the direction of the language
  private isRTL: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLangRTL: Observable<boolean> = this.isRTL.asObservable();

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
