// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {LanguageCodes} from '../../../app.constants';
import {T} from '../../../t.const';

export const LANGUAGE_SELECTION_FORM_FORM: ConfigFormSection = {
  title: T.F_LANG.TITLE,
  key: 'lang',
  items: [
    {
      key: 'lng',
      type: 'select',
      templateOptions: {
        label: T.F_LANG.LABEL,
        options: [
          {label: T.F_LANG.EN, value: LanguageCodes.en},
          {label: T.F_LANG.ZH, value: LanguageCodes.zh},
          {label: T.F_LANG.FR, value: LanguageCodes.fr},
          {label: T.F_LANG.RU, value: LanguageCodes.ru},
          {label: T.F_LANG.JA, value: LanguageCodes.ja},
          {label: T.F_LANG.DE, value: LanguageCodes.de},
          {label: T.F_LANG.AR, value: LanguageCodes.ar},
          {label: T.F_LANG.TR, value: LanguageCodes.tr},
        ],
      },
    },
  ]
};
