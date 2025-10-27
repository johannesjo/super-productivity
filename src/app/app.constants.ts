import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';

export const IS_ELECTRON = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
// effectively IS_BROWSER
export const IS_WEB_EXTENSION_REQUIRED_FOR_JIRA = !IS_ELECTRON && !IS_ANDROID_WEB_VIEW;

export const TRACKING_INTERVAL = 1000;
export const TIME_TRACKING_TO_DB_INTERVAL = 15000;

export const DRAG_DELAY_FOR_TOUCH = 100;

// TODO use
// const CORS_SKIP_EXTRA_HEADER_PROP = 'sp_cors_skip' as const;
// export const CORS_SKIP_EXTRA_HEADERS: { [name: string]: string } = IS_ANDROID_WEB_VIEW
//   ? ({
//       [CORS_SKIP_EXTRA_HEADER_PROP]: 'true',
//     } as const)
//   : {};
export const CORS_SKIP_EXTRA_HEADERS: { [name: string]: string } = IS_ANDROID_WEB_VIEW
  ? {}
  : {};

import '@angular/common/locales/global/en';
import '@angular/common/locales/global/es';
import '@angular/common/locales/global/de';
import '@angular/common/locales/global/ar';
import '@angular/common/locales/global/cs';
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
import '@angular/common/locales/global/uk';
import '@angular/common/locales/global/id';

export enum LanguageCode {
  ar = 'ar',
  de = 'de',
  cz = 'cz',
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
  uk = 'uk',
  zh = 'zh',
  zh_tw = 'zh_tw',
}

export enum LanguageCodeMomentMap {
  ar = 'ar',
  de = 'de',
  cz = 'cs',
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
  uk = 'uk',
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
  isDisableBackgroundTint = 'isDisableBackgroundTint',
  isEnabledBackgroundGradient = 'isEnabledBackgroundGradient',
  isDisableAnimations = 'isDisableAnimations',
  isDataImportInProgress = 'isDataImportInProgress',
  hasBgImage = 'hasBgImage',
  hasMobileBottomNav = 'hasMobileBottomNav',

  isAndroidKeyboardShown = 'isAndroidKeyboardShown',
  isAndroidKeyboardHidden = 'isAndroidKeyboardHidden',
  isAddTaskBarOpen = 'isAddTaskBarOpen',
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

/* eslint-disable @typescript-eslint/naming-convention */
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
