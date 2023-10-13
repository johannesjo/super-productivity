export const WORKLOG_DATE_STR_FORMAT = 'YYYY-MM-DD';
export const IS_ELECTRON = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
export const TRACKING_INTERVAL = 1000;

export const MODEL_VERSION_KEY = '__modelVersion';

import '@angular/common/locales/global/en';
import '@angular/common/locales/global/es';
import '@angular/common/locales/global/de';
import '@angular/common/locales/global/ar';
import '@angular/common/locales/global/fa';
import '@angular/common/locales/global/fr';
import '@angular/common/locales/global/ja';
import '@angular/common/locales/global/ko';
import '@angular/common/locales/global/ru';
import '@angular/common/locales/global/sk';
import '@angular/common/locales/global/tr';
import '@angular/common/locales/global/zh';
import '@angular/common/locales/global/zh-Hant';
import '@angular/common/locales/global/it';
import '@angular/common/locales/global/pl';
import '@angular/common/locales/global/pt';
import '@angular/common/locales/global/nl';
import '@angular/common/locales/global/nb';
import '@angular/common/locales/global/hr';

export const DAY_STARTS_AT: string = '9:00';

export const ALL_THEMES: string[] = [
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
  ar = 'ar',
  de = 'de',
  en = 'en',
  es = 'es',
  fa = 'fa',
  fr = 'fr',
  hr = 'hr',
  id = 'id',
  it = 'it',
  ja = 'ja',
  ko = 'ko',
  nl = 'nl',
  nb = 'nb',
  pl = 'pl',
  pt = 'pt',
  ru = 'ru',
  sk = 'sk',
  tr = 'tr',
  zh = 'zh',
  zh_tw = 'zh_tw',
}

export enum LanguageCodeMomentMap {
  ar = 'ar',
  de = 'de',
  en = 'en',
  es = 'es',
  fa = 'fa',
  fr = 'fr',
  hr = 'hr',
  id = 'id',
  it = 'it',
  ja = 'ja',
  ko = 'ko',
  nl = 'nl',
  nb = 'nb',
  pl = 'pl',
  pt = 'pt',
  ru = 'ru',
  sk = 'sk',
  tr = 'tr',
  zh = 'zh-cn',
  zh_tw = 'zh-tw',
}

export enum BodyClass {
  isElectron = 'isElectron',
  isWeb = 'isWeb',
  isMac = 'isMac',
  isNoMac = 'isNoMac',
  isNoFirefox = 'isNoFirefox',
  isExtension = 'isExtension',
  isAdvancedFeatures = 'isAdvancedFeatures',
  isNoAdvancedFeatures = 'isNoAdvancedFeatures',
  isTouchOnly = 'isTouchOnly',
  isNoTouchOnly = 'isNoTouchOnly',

  isTouchPrimary = 'isTouchPrimary',
  isMousePrimary = 'isMousePrimary',
  isLightTheme = 'isLightTheme',
  isDarkTheme = 'isDarkTheme',
  isDisableBackgroundGradient = 'isDisableBackgroundGradient',
  isEnabledBackgroundGradient = 'isEnabledBackgroundGradient',
  isDisableAnimations = 'isDisableAnimations',
  isDataImportInProgress = 'isDataImportInProgress',
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
  LanguageCode.zh_tw,
  LanguageCode.ar,
  LanguageCode.fa,
  LanguageCode.ja,
  LanguageCode.ko,
  LanguageCode.ru,
  LanguageCode.tr,
];

export const RTL_LANGUAGES: LanguageCode[] = [LanguageCode.ar, LanguageCode.fa];

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
