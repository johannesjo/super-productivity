import { ConfigOption, FormlyFieldConfig } from '@ngx-formly/core';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { T } from '../../t.const';

export class TranslateExtension {
  constructor(private translate: TranslateService) {}

  prePopulate(field: FormlyFieldConfig) {
    const to = field.templateOptions || {};
    if (Array.isArray(to.options)) {
      const options = to.options;
      to.options = this.translate
        .stream(options.map((o) => o.label))
        .pipe(map((labels) => options.map((o) => ({ ...o, label: labels[o.label] }))));
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
      name: 'minlength',
      message: (err, field: FormlyFieldConfig) =>
        translate.stream(T.V.E_MIN_LENGTH, {
          val: field.templateOptions ? field.templateOptions.minLength : null,
        }),
    },
    {
      name: 'maxlength',
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
