// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {LanguageCodes} from '../../../app.constants';
import {T} from '../../../t.const';

export const LANGUAGE_SELECTION_FORM_FORM: ConfigFormSection = {
  title: 'Language',
  key: 'lang',
  items: [
    {
      key: 'lng',
      type: 'select',
      templateOptions: {
        label: T.fLang.label,
        options: [
          {label: T.fLang.en, value: LanguageCodes.en},
          {label: T.fLang.zh, value: LanguageCodes.zh},
          {label: T.fLang.fr, value: LanguageCodes.fr},
          {label: T.fLang.ru, value: LanguageCodes.ru},
          {label: T.fLang.ja, value: LanguageCodes.ja},
          {label: T.fLang.de, value: LanguageCodes.de},
          {label: T.fLang.ar, value: LanguageCodes.ar},
          {label: T.fLang.tr, value: LanguageCodes.tr},
        ],
      },
    },
  ]
};
