export const WORKLOG_DATE_STR_FORMAT = 'YYYY-MM-DD';
export const IS_ELECTRON = (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);
export const TRACKING_INTERVAL = 1000;

export const MODEL_VERSION_KEY = '__modelVersion';

import en from '@angular/common/locales/en';
import es from '@angular/common/locales/es';
import de from '@angular/common/locales/de';
import ar from '@angular/common/locales/ar';
import fa from '@angular/common/locales/fa';
import fr from '@angular/common/locales/fr';
import ja from '@angular/common/locales/ja';
import ko from '@angular/common/locales/ko';
import ru from '@angular/common/locales/ru';
import tr from '@angular/common/locales/tr';
import zh from '@angular/common/locales/zh';
import it from '@angular/common/locales/it';
import pt from '@angular/common/locales/pt';
import nl from '@angular/common/locales/nl';

export const NG_LOCALES = {
  en,
  es,
  de,
  ar,
  fa,
  fr,
  ja,
  ko,
  ru,
  tr,
  zh,
  it,
  pt,
  nl,
};


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


export enum LanguageCode {
  en = 'en',
  es = 'es',
  de = 'de',
  ar = 'ar',
  fa = 'fa',
  fr = 'fr',
  ja = 'ja',
  ko = 'ko',
  ru = 'ru',
  tr = 'tr',
  zh = 'zh',
  it = 'it',
  pt = 'pt',
  nl = 'nl',
}

export enum LanguageCodeMomentMap {
  en = 'en',
  es = 'es',
  de = 'de',
  ar = 'ar',
  fa = 'fa',
  fr = 'fr',
  ja = 'ja',
  ko = 'ko',
  ru = 'ru',
  tr = 'tr',
  it = 'it',
  pt = 'pt',
  nl = 'nl',
  zh = 'zh-cn',
}

export enum BodyClass {
  isElectron = 'isElectron',
  isWeb = 'isWeb',
  isMac = 'isMac',
  isNoMac = 'isNoMac',
  isExtension = 'isExtension',
  isAdvancedFeatures = 'isAdvancedFeatures',
  isNoAdvancedFeatures = 'isNoAdvancedFeatures',
  isTouchOnlyDevice = 'isTouchOnlyDevice',
  isNoTouchOnlyDevice = 'isNoTouchOnlyDevice',
  isLightTheme = 'isLightTheme',
  isDarkTheme = 'isDarkTheme',
  isDisableBackgroundGradient = 'isDisableBackgroundGradient',
}

export enum MainContainerClass {
  isSmallMainContainer = 'isSmallMainContainer',
  isVerySmallMainContainer = 'isVerySmallMainContainer',
}

export enum HelperClasses {
  isHideForAdvancedFeatures = 'isHideForAdvancedFeatures',
  isHideForNoAdvancedFeatures = 'isHideForNoAdvancedFeatures',
}

// we're assuming that the other language speakers are likely to speak english
// and as english offers most likely the best experience, we use it as default
export const AUTO_SWITCH_LNGS: LanguageCode[] = [
  LanguageCode.zh,
  LanguageCode.ar,
  LanguageCode.fa,
  LanguageCode.ja,
  LanguageCode.ko,
  LanguageCode.ru,
  LanguageCode.tr,
];

export const RTL_LANGUAGES: LanguageCode[] = [
  LanguageCode.ar,
  LanguageCode.fa
];

export enum THEME_COLOR_MAP {
  'light-blue' = '#03a9f4',
  'pink' = '#e91e63',
  'indigo' = '#3f51b5',
  'purple' = '#9c27b0',
  'deep-purple' = '#673ab7',
  'blue' = '#2196f3',
  'cyan' = '#00bcd4',
  'teal' = '#009688',
  'green' = '#4caf50',
  'light-green' = '#8bc34a',
  'lime' = '#cddc39',
  'yellow' = '#ffeb3b',
  'amber' = '#ffc107',
  'orange' = '#ff9800',
  'deep-orange' = '#ff5722',
  'brown' = '#795548',
  'grey' = '#9e9e9e',
  'blue-grey' = '#607d8b',
}

export const HANDLED_ERROR_PROP_STR = 'HANDLED_ERROR_PROP';
