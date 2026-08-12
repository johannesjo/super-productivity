// Framework-free i18n: a typed-ish dictionary registry, a parameterized
// translate helper, and deterministic locale fallback (missing keys fall back
// to the base locale, then to the key itself). The registry holds the
// structure for up to 175 locales; `en` is authoritative and validated for
// completeness by tests. Never logs user content.
const registry = new Map();
let baseLocale = 'en';
export const registerLocale = (locale) => {
    registry.set(locale.code, locale);
    if (locale.code === baseLocale || !registry.has(baseLocale))
        baseLocale = locale.code;
};
export const localeCodes = () => [...registry.keys()];
export const hasKey = (dict, key) => key in dict;
/** Merges the base dict with a locale's partial dict (fallback semantics). */
export const resolveDict = (code) => {
    const base = registry.get(baseLocale)?.dict ?? {};
    const entry = registry.get(code);
    const partial = entry?.dict ?? {};
    // A regional variant (en-US) resolves to its language base (en) for missing keys.
    const language = entry?.language;
    const languageBase = language ? (registry.get(language)?.dict ?? {}) : {};
    return { ...base, ...languageBase, ...partial };
};
export const translate = (dict, key, params) => {
    let value = dict[key] ?? key;
    if (params) {
        for (const [name, replacement] of Object.entries(params)) {
            value = value.replace(`{${name}}`, String(replacement));
        }
    }
    return value;
};
/** Parameterized translate bound to one locale (for Svelte reactions). */
export const createTranslator = (code) => {
    const dict = resolveDict(code);
    return (key, params) => translate(dict, key, params);
};
/**
 * Validates a locale dictionary for completeness against base keys. Returns the
 * list of missing keys so tests can fail loudly when `en` drifts.
 */
export const missingKeys = (dict, base = registry.get(baseLocale)?.dict ?? {}) => Object.keys(base).filter((key) => !(key in dict));
export const resetLocales = () => {
    registry.clear();
    baseLocale = 'en';
};
