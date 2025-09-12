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
          { label: T.GCF.LANG.CZ, value: LanguageCode.cz },
          { label: T.GCF.LANG.DE, value: LanguageCode.de },
          { label: T.GCF.LANG.ES, value: LanguageCode.es },
          { label: T.GCF.LANG.EN, value: LanguageCode.en },
          { label: T.GCF.LANG.FA, value: LanguageCode.fa },
          { label: T.GCF.LANG.FR, value: LanguageCode.fr },
          { label: T.GCF.LANG.HR, value: LanguageCode.hr },
          { label: T.GCF.LANG.ID, value: LanguageCode.id },
          { label: T.GCF.LANG.IT, value: LanguageCode.it },
          { label: T.GCF.LANG.JA, value: LanguageCode.ja },
          { label: T.GCF.LANG.KO, value: LanguageCode.ko },
          { label: T.GCF.LANG.NB, value: LanguageCode.nb },
          { label: T.GCF.LANG.NL, value: LanguageCode.nl },
          { label: T.GCF.LANG.PL, value: LanguageCode.pl },
          { label: T.GCF.LANG.PT, value: LanguageCode.pt },
          { label: T.GCF.LANG.RU, value: LanguageCode.ru },
          { label: T.GCF.LANG.SK, value: LanguageCode.sk },
          { label: T.GCF.LANG.TR, value: LanguageCode.tr },
          { label: T.GCF.LANG.UK, value: LanguageCode.uk },
          { label: T.GCF.LANG.ZH, value: LanguageCode.zh },
          { label: T.GCF.LANG.ZH_TW, value: LanguageCode.zh_tw },
        ],
      },
    },
    {
      key: 'timeLocale',
      type: 'select',
      templateOptions: {
        label: T.GCF.LANG.TIME_LOCALE,
        description: T.GCF.LANG.TIME_LOCALE_DESCRIPTION,
        options: [
          { label: T.GCF.LANG.TIME_LOCALE_AUTO, value: undefined },
          { label: T.GCF.LANG.TIME_LOCALE_EN_US, value: 'en-US' },
          { label: T.GCF.LANG.TIME_LOCALE_EN_GB, value: 'en-GB' },
          { label: T.GCF.LANG.TIME_LOCALE_TR_TR, value: 'tr-TR' },
          { label: T.GCF.LANG.TIME_LOCALE_DE_DE, value: 'de-DE' },
          { label: T.GCF.LANG.TIME_LOCALE_FR_FR, value: 'fr-FR' },
          { label: T.GCF.LANG.TIME_LOCALE_ES_ES, value: 'es-ES' },
          { label: T.GCF.LANG.TIME_LOCALE_IT_IT, value: 'it-IT' },
          { label: T.GCF.LANG.TIME_LOCALE_PT_BR, value: 'pt-BR' },
          { label: T.GCF.LANG.TIME_LOCALE_RU_RU, value: 'ru-RU' },
          { label: T.GCF.LANG.TIME_LOCALE_ZH_CN, value: 'zh-CN' },
          { label: T.GCF.LANG.TIME_LOCALE_JA_JP, value: 'ja-JP' },
          { label: T.GCF.LANG.TIME_LOCALE_KO_KR, value: 'ko-KR' },
        ],
      },
    },
  ],
};
