import {FormlyFieldConfig} from '@ngx-formly/core';
import {TranslateService} from '@ngx-translate/core';
import {of} from 'rxjs';

export class TranslateExtension {
  constructor(
    private translate: TranslateService,
  ) {
  }

  prePopulate(field: FormlyFieldConfig) {
    const to = field.templateOptions || {};

    field.expressionProperties = {
      ...(field.expressionProperties || {}),
      ...(to.label
        ? {'templateOptions.label': this.translate.stream(to.label)}
        : {}),
      ...(to.description
        ? {'templateOptions.description': this.translate.stream(to.description)}
        : {}),
      ...(to.placeholder
        ? {'templateOptions.placeholder': this.translate.stream(to.placeholder)}
        : {}),
      ...(to.options && Array.isArray(to.options)
        ? {
          // TODO better solution working with live changes
          'templateOptions.options': of(to.options.map((opt) => {
            return {
              ...opt,
              label: opt.label && this.translate.instant(opt.label),
            };
          })),
        }
        : {}),
    };
  }
}

export function registerTranslateExtension(translate: TranslateService) {
  return {
    extensions: [{
      name: 'translate',
      extension: new TranslateExtension(translate)
    }],
  };
}
