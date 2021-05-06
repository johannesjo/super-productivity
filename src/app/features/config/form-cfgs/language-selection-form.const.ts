/* eslint-disable max-len */
import { ConfigFormSection, LanguageConfig } from '../global-config.model';
import { LanguageCode } from '../../../app.constants';
import { T } from '../../../t.const';

export const LANGUAGE_SELECTION_FORM_FORM: ConfigFormSection<LanguageConfig> = {
  title: T.GCF.LANG.TITLE,
  key: 'lang',
  items: [
    {
      key: 'lng',
      type: 'select',
      templateOptions: {
        label: T.GCF.LANG.LABEL,
        options: [
          { label: T.GCF.LANG.AR, value: LanguageCode.ar },
          { label: T.GCF.LANG.ZH, value: LanguageCode.zh },
          { label: T.GCF.LANG.ZH_TW, value: LanguageCode.zh_tw },
          { label: T.GCF.LANG.EN, value: LanguageCode.en },
          { label: T.GCF.LANG.DE, value: LanguageCode.de },
          { label: T.GCF.LANG.FA, value: LanguageCode.fa },
          { label: T.GCF.LANG.FR, value: LanguageCode.fr },
          { label: T.GCF.LANG.JA, value: LanguageCode.ja },
          { label: T.GCF.LANG.KO, value: LanguageCode.ko },
          { label: T.GCF.LANG.RU, value: LanguageCode.ru },
          { label: T.GCF.LANG.ES, value: LanguageCode.es },
          { label: T.GCF.LANG.TR, value: LanguageCode.tr },
          { label: T.GCF.LANG.IT, value: LanguageCode.it },
          { label: T.GCF.LANG.PT, value: LanguageCode.pt },
          { label: T.GCF.LANG.NL, value: LanguageCode.nl },
          { label: T.GCF.LANG.NB, value: LanguageCode.nb },
        ],
      },
    },
  ],
};
