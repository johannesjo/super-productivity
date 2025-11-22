import { IS_ANDROID_WEB_VIEW } from './util/is-android-web-view';

export const IS_ELECTRON = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
// effectively IS_BROWSER
export const IS_WEB_BROWSER = !IS_ELECTRON && !IS_ANDROID_WEB_VIEW;

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

/**
 * Constants representing history state keys.
 * Used in the `window.history.pushState/replaceState` methods when opening an overlay
 * that can later be closed by pressing the "back" button in the browser or mobile app.
 *
 * ATTENTION: `window.history.state` can be `null`.
 * Always use optional chaining: `window.history.state?.[HISTORY_STATE.MOBILE_NAVIGATION]`
 */
export const HISTORY_STATE = {
  MOBILE_NAVIGATION: 'mobileSideNav',
  TASK_DETAIL_PANEL: 'taskDetailPanel',
};

// === Localization section ===
// TODO move to separate file
import localeEnUS from '@angular/common/locales/en';
import localeEnGB from '@angular/common/locales/en-GB';
import localeEs from '@angular/common/locales/es';
import localeDe from '@angular/common/locales/de';
import localeAr from '@angular/common/locales/ar';
import localeCs from '@angular/common/locales/cs';
import localeFa from '@angular/common/locales/fa';
import localeFr from '@angular/common/locales/fr';
import localeJa from '@angular/common/locales/ja';
import localeKo from '@angular/common/locales/ko';
import localeRu from '@angular/common/locales/ru';
import localeSk from '@angular/common/locales/sk';
import localeTr from '@angular/common/locales/tr';
import localeZh from '@angular/common/locales/zh';
import localeIt from '@angular/common/locales/it';
import localePl from '@angular/common/locales/pl';
import localePt from '@angular/common/locales/pt';
import localeNl from '@angular/common/locales/nl';
import localeNb from '@angular/common/locales/nb';
import localeHr from '@angular/common/locales/hr';
import localeUk from '@angular/common/locales/uk';
import localeId from '@angular/common/locales/id';

/**
 * General code for the languages.
 * ! It does not indicate a specific region and may include all language-speaking countries.
 *
 * Standard: ISO-639
 */
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
  zh = 'zh', // "Simplified Chinese" form
  zh_tw = 'zh-tw', // "Traditional Chinese" form
}

/**
 * We're assuming that the other language speakers are likely to speak english
 * and as english offers most likely the best experience, we use it as default
 */
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

/**
 * This is a specification for the language used in specific countries
 * ! Indicates a specific region and includes language and formatting specifics for that region.
 *
 * Standard: ISO-639 + ISO-3166 combination
 */
export const Locales = {
  ...LanguageCode,
  en_gb: `${LanguageCode.en}-GB`,
  en_us: `${LanguageCode.en}-US`,
  tr_tr: `${LanguageCode.tr}-TR`,
  de_de: `${LanguageCode.de}-DE`,
  fr_fr: `${LanguageCode.fr}-FR`,
  es_es: `${LanguageCode.es}-ES`,
  it_it: `${LanguageCode.it}-IT`,
  pt_br: `${LanguageCode.pt}-BR`,
  ru_ru: `${LanguageCode.ru}-RU`,
  zh_cn: `${LanguageCode.zh}-CN`,
  ja_jp: `${LanguageCode.ja}-JP`,
  ko_kr: `${LanguageCode.ko}-KR`,
} as const;

export type Locale = (typeof Locales)[keyof typeof Locales];

export const LocalesImports: Record<keyof typeof Locales, unknown> = {
  en: localeEnGB,
  en_gb: localeEnGB,
  en_us: localeEnUS,
  tr_tr: localeTr,
  de_de: localeDe,
  de: localeDe,
  fr_fr: localeFr,
  es_es: localeEs,
  es: localeEs,
  it_it: localeIt,
  pt_br: localePt,
  ru_ru: localeRu,
  ru: localeRu,
  zh_cn: localeZh,
  ja_jp: localeJa,
  ja: localeJa,
  ko_kr: localeKo,
  ko: localeKo,
  zh_tw: localeZh,
  ar: localeAr,
  cz: localeCs,
  fa: localeFa,
  fr: localeFr,
  id: localeId,
  it: localeIt,
  pl: localePl,
  pt: localePt,
  nl: localeNl,
  nb: localeNb,
  hr: localeHr,
  uk: localeUk,
  sk: localeSk,
  tr: localeTr,
  zh: localeZh,
};

export const RTL_LANGUAGES: LanguageCode[] = [LanguageCode.ar, LanguageCode.fa];

export const DEFAULT_LANGUAGE = LanguageCode.en;
export const DEFAULT_LOCALE = Locales.en_gb;
export const DEFAULT_FIRST_DAY_OF_WEEK = 1; // monday
