import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {FormlyConfig, FormlyFieldConfig} from '@ngx-formly/core';
import {T} from '../../t.const';

@Injectable({
  providedIn: 'root'
})
export class FormlyValidationService {

  constructor(
    private _translateService: TranslateService,
    private _formlyConfig: FormlyConfig) {
  }

  init(): void {
    // message without params
    this._formlyConfig.addValidatorMessage('required', (err, field) => this._translateService.instant(T.V.E_REQUIRED));

    // message with params
    this._formlyConfig.addValidatorMessage('minlength', (err, field) => this.minlengthValidationMessage(err, field, this._translateService));
    this._formlyConfig.addValidatorMessage('maxlength', (err, field) => this.maxlengthValidationMessage(err, field, this._translateService));
    this._formlyConfig.addValidatorMessage('min', (err, field) => this.minValidationMessage(err, field, this._translateService));
    this._formlyConfig.addValidatorMessage('max', (err, field) => this.maxValidationMessage(err, field, this._translateService));
  }

  private minlengthValidationMessage(err, field: FormlyFieldConfig, translate: TranslateService) {
    return translate.instant(T.V.E_MIN_LENGTH, {val: field.templateOptions.minLength});
  }

  private maxlengthValidationMessage(err, field: FormlyFieldConfig, translate: TranslateService) {
    return translate.instant(T.V.E_MAX_LENGTH, {val: field.templateOptions.maxLength});
  }

  private minValidationMessage(err, field: FormlyFieldConfig, translate: TranslateService) {
    return translate.instant(T.V.E_MIN, {val: field.templateOptions.min});
  }

  private maxValidationMessage(err, field: FormlyFieldConfig, translate: TranslateService) {
    return translate.instant(T.V.E_MAX, {val: field.templateOptions.max});
  }
}
