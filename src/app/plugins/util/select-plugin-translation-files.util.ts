import { SUPPORTED_LANGUAGE_CODES } from '../../core/locale.constants';

export interface SelectedTranslationFile {
  lang: string;
  bytes: Uint8Array;
}

export type SkippedTranslationReason = 'unsupported-language' | 'file-missing';

export interface SkippedTranslation {
  lang: string;
  reason: SkippedTranslationReason;
}

export interface SelectedTranslationFiles {
  files: SelectedTranslationFile[];
  skipped: SkippedTranslation[];
}

/**
 * Pick the translation files a plugin ZIP actually ships for the languages its
 * manifest declares. Pure selection only — size limits and decoding are the
 * caller's policy.
 *
 * Languages are de-duplicated because a manifest may repeat a code, and every
 * skip is reported so the caller can tell the plugin author why a declared
 * language produced no translations (#9459 was exactly this failure, silent).
 */
export const selectPluginTranslationFiles = (
  extractedFiles: Record<string, Uint8Array>,
  languages: readonly string[],
): SelectedTranslationFiles => {
  const files: SelectedTranslationFile[] = [];
  const skipped: SkippedTranslation[] = [];

  for (const lang of new Set(languages)) {
    if (!SUPPORTED_LANGUAGE_CODES.has(lang)) {
      skipped.push({ lang, reason: 'unsupported-language' });
      continue;
    }
    const bytes = extractedFiles[`i18n/${lang}.json`];
    if (bytes === undefined) {
      skipped.push({ lang, reason: 'file-missing' });
      continue;
    }
    files.push({ lang, bytes });
  }

  return { files, skipped };
};
