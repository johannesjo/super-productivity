export const WORKLOG_DATE_STR_FORMAT = 'YYYY-MM-DD';
export const IS_ELECTRON = (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
export const TRACKING_INTERVAL = 1000;

export const ALL_THEMES = [
  'blue',
  'blue-grey',
  'light-blue',
  'indigo',
  'pink',
  'purple',
  'deep-purple',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'deep-orange',
];

export const HANDLED_ERROR = '--HANDLED_ERROR--';

export enum LanguageCode {
  en = 'en',
  es = 'es',
  de = 'de',
  ar = 'ar',
  fr = 'fr',
  ja = 'ja',
  ru = 'ru',
  tr = 'tr',
  zh = 'zh',
}

export enum LanguageCodeMomentMap {
  en = 'en',
  es = 'es',
  de = 'de',
  ar = 'ar',
  fr = 'fr',
  ja = 'ja',
  ru = 'ru',
  tr = 'tr',
  zh = 'zh-cn',
}

// we're assuming that the other language speakers are likely to speak english
// and as english offers most likely the best experience, we use it as default
export const AUTO_SWITCH_LNGS: LanguageCode[] = [
  LanguageCode.zh,
  LanguageCode.ar,
  LanguageCode.ja,
  LanguageCode.ru,
  LanguageCode.tr,
];
