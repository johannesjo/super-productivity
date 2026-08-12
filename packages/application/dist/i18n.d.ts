export type LocaleKey = string;
export interface LocaleDict {
    [key: string]: string;
}
export type LocaleCode = 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'ja' | 'zh' | 'ko' | (string & {});
export interface RegisteredLocale {
    code: LocaleCode;
    /** Regional variants fall back to the language code (e.g. en-US -> en). */
    language?: LocaleCode;
    dict: LocaleDict;
}
export declare const registerLocale: (locale: RegisteredLocale) => void;
export declare const localeCodes: () => LocaleCode[];
export declare const hasKey: (dict: LocaleDict, key: string) => boolean;
/** Merges the base dict with a locale's partial dict (fallback semantics). */
export declare const resolveDict: (code: LocaleCode) => LocaleDict;
export declare const translate: (dict: LocaleDict, key: string, params?: Record<string, string | number>) => string;
/** Parameterized translate bound to one locale (for Svelte reactions). */
export declare const createTranslator: (code: LocaleCode) => (key: string, params?: Record<string, string | number>) => string;
/**
 * Validates a locale dictionary for completeness against base keys. Returns the
 * list of missing keys so tests can fail loudly when `en` drifts.
 */
export declare const missingKeys: (dict: LocaleDict, base?: LocaleDict) => string[];
export declare const resetLocales: () => void;
