// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {LanguageCode} from '../../../app.constants';
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
          {label: T.F_LANG.AR, value: LanguageCode.ar},
          {label: T.F_LANG.ZH, value: LanguageCode.zh},
          {label: T.F_LANG.EN, value: LanguageCode.en},
          {label: T.F_LANG.DE, value: LanguageCode.de},
          {label: T.F_LANG.FR, value: LanguageCode.fr},
          {label: T.F_LANG.JA, value: LanguageCode.ja},
          {label: T.F_LANG.KO, value: LanguageCode.ko},
          {label: T.F_LANG.RU, value: LanguageCode.ru},
          {label: T.F_LANG.ES, value: LanguageCode.es},
          {label: T.F_LANG.TR, value: LanguageCode.tr},
        ],
      },
    },
  ]
};
