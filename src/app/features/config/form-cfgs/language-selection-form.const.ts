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
        label: T.F_LANG.LABEL,
        options: [
          {label: T.F_LANG.EN, value: LanguageCodes.EN},
          {label: T.F_LANG.ZH, value: LanguageCodes.ZH},
          {label: T.F_LANG.FR, value: LanguageCodes.FR},
          {label: T.F_LANG.RU, value: LanguageCodes.RU},
          {label: T.F_LANG.JA, value: LanguageCodes.JA},
          {label: T.F_LANG.DE, value: LanguageCodes.DE},
          {label: T.F_LANG.AR, value: LanguageCodes.AR},
          {label: T.F_LANG.TR, value: LanguageCodes.TR},
        ],
      },
    },
  ]
};
