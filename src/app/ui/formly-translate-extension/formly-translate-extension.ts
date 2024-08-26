import { ConfigOption, FormlyFieldConfig } from '@ngx-formly/core';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { T } from '../../t.const';

/* eslint-disable @typescript-eslint/naming-convention */

export class TranslateExtension {
  constructor(private translate: TranslateService) {}

  prePopulate(field: FormlyFieldConfig): void {
    const to = field.templateOptions || {};
    if (Array.isArray(to.options)) {
      const options = to.options;
      to.options = this.translate
        .stream(options.map((o) => o.label))
        .pipe(map((labels) => options.map((o) => ({ ...o, label: labels[o.label] }))));
    }

    const validators = field.validators || {};
    for (const [k, validator] of Object.entries(validators)) {
      const v = validator as any;
      if (v.message && typeof v.message === 'string') {
        validators[k].message = this.translate.stream(v.message);
      }
    }

    field.expressionProperties = {
      ...(field.expressionProperties || {}),
      ...(to.label ? { 'templateOptions.label': this.translate.stream(to.label) } : {}),
      ...(to.description
        ? { 'templateOptions.description': this.translate.stream(to.description) }
        : {}),
      ...(to.placeholder
        ? { 'templateOptions.placeholder': this.translate.stream(to.placeholder) }
        : {}),
    };
  }
}

export const registerTranslateExtension = (
  translate: TranslateService,
): ConfigOption => ({
  extensions: [
    {
      name: 'translate',
      extension: new TranslateExtension(translate),
    },
  ],
  validationMessages: [
    { name: 'required', message: () => translate.stream(T.V.E_REQUIRED) },
    {
      name: 'minLength',
      message: (err, field: FormlyFieldConfig) =>
        translate.stream(T.V.E_MIN_LENGTH, {
          val: field.templateOptions ? field.templateOptions.minLength : null,
        }),
    },
    {
      name: 'maxLength',
      message: (err, field: FormlyFieldConfig) =>
        translate.stream(T.V.E_MAX_LENGTH, {
          val: field.templateOptions ? field.templateOptions.maxLength : null,
        }),
    },
    {
      name: 'min',
      message: (err, field) =>
        translate.stream(T.V.E_MIN, {
          val: field.templateOptions ? field.templateOptions.min : null,
        }),
    },
    {
      name: 'max',
      message: (err, field) =>
        translate.stream(T.V.E_MAX, {
          val: field.templateOptions ? field.templateOptions.max : null,
        }),
    },
  ],
});
