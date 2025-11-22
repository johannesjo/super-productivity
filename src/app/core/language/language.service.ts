import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AUTO_SWITCH_LNGS,
  DEFAULT_LANGUAGE,
  LanguageCode,
  RTL_LANGUAGES,
} from '../../app.constants';
import { Log } from '../log';
import { DateTimeFormatService } from '../date-time-format/date-time-format.service';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _translateService = inject(TranslateService);
  private _dateTimeFormatService = inject(DateTimeFormatService);

  // I think a better approach is to add a field in every [lang].json file to specify the direction of the language
  private readonly _isRTL = signal<boolean>(false);
  readonly isLangRTL = this._isRTL.asReadonly();

  detect(): LanguageCode {
    const detected = this._translateService.getBrowserLang();
    return this.isValid(detected) ? detected : DEFAULT_LANGUAGE;
  }

  isValid(lang?: string): lang is LanguageCode {
    return Object.values(LanguageCode).includes(lang as LanguageCode);
  }

  setLng(lng?: LanguageCode | null): void {
    if (!lng) this._set(this.detect());
    else if (this.isValid(lng)) this._set(lng);
    else {
      Log.err('Invalid language code', lng);
      this.tryAutoswitch();
    }
  }

  tryAutoswitch(): boolean {
    const browserLng = this.detect();
    const needAutoswitch = AUTO_SWITCH_LNGS.includes(browserLng);
    if (!needAutoswitch) return false;

    this._set(DEFAULT_LANGUAGE);
    return true;
  }

  private _set(lng: LanguageCode): void {
    this._isRTL.set(this._checkIsRTL(lng));
    this._translateService.use(lng);

    this._dateTimeFormatService.setDateAdapterLocale(lng);
  }

  private _checkIsRTL(lng: LanguageCode): boolean {
    return RTL_LANGUAGES.indexOf(lng) !== -1;
  }
}
