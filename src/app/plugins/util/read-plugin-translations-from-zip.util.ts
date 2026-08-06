import { SUPPORTED_LANGUAGE_CODES } from '../../core/locale.constants';
import { PluginLog } from '../../core/log';

const TEXT_DECODER = new TextDecoder();

export type SkippedTranslationReason = 'file-missing' | 'invalid-json';

export interface SkippedTranslation {
  lang: string;
  reason: SkippedTranslationReason;
}

export interface PluginTranslationsFromZip {
  /** Language code -> raw JSON text, ready for both the cache and the i18n service. */
  translations: Record<string, string>;
  /** UTF-8 bytes of everything in `translations`, i.e. what this plugin adds to the cache. */
  totalBytes: number;
  skipped: SkippedTranslation[];
  /** True when `maxTotalBytes` was hit; extraction stopped and the caller must reject. */
  isOverLimit: boolean;
}

/**
 * Read the translation files a plugin ZIP ships for the languages its manifest
 * declares. Uploaded plugins live at a virtual cache path, so anything not taken
 * here is unreachable once the ZIP is discarded.
 *
 * Languages are de-duplicated because a manifest may repeat a code, and each skip
 * is reported so the caller can tell the author why a declared language produced
 * no translations — #9459 was exactly that failure, silent. Codes the app does not
 * support are dropped without a skip entry: `validatePluginManifest` already warns
 * about those, and re-reporting them here would duplicate the rule.
 */
export const readPluginTranslationsFromZip = (
  extractedFiles: Record<string, Uint8Array>,
  languages: readonly string[],
  maxTotalBytes: number,
): PluginTranslationsFromZip => {
  const translations: Record<string, string> = {};
  const skipped: SkippedTranslation[] = [];
  let totalBytes = 0;

  for (const lang of new Set(languages)) {
    if (!SUPPORTED_LANGUAGE_CODES.has(lang)) {
      continue;
    }
    const bytes = extractedFiles[`i18n/${lang}.json`];
    if (bytes === undefined) {
      skipped.push({ lang, reason: 'file-missing' });
      continue;
    }
    // Check before decoding so an oversized set never materializes as strings.
    if (totalBytes + bytes.length > maxTotalBytes) {
      return { translations, totalBytes, skipped, isOverLimit: true };
    }
    const content = TEXT_DECODER.decode(bytes);
    // Parse purely to validate. The cache contract is raw JSON text (parsed again
    // by PluginI18nService), and unparseable content stored there would survive
    // every restart while silently degrading translate() to returning keys.
    try {
      JSON.parse(content);
    } catch {
      skipped.push({ lang, reason: 'invalid-json' });
      continue;
    }
    totalBytes += bytes.length;
    translations[lang] = content;
  }

  return { translations, totalBytes, skipped, isOverLimit: false };
};

/**
 * `skipped` is bounded by the supported-language count, so this cannot flood the
 * (exportable, ring-buffered) log history.
 */
export const logSkippedPluginTranslations = (
  pluginId: string,
  skipped: readonly SkippedTranslation[],
): void => {
  for (const { lang, reason } of skipped) {
    PluginLog.err(
      `Plugin ${pluginId} declares i18n language "${lang}" but no translations were loaded (${reason})`,
    );
  }
};
