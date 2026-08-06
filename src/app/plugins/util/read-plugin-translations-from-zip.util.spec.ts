import { readPluginTranslationsFromZip } from './read-plugin-translations-from-zip.util';

describe('readPluginTranslationsFromZip', () => {
  const NO_LIMIT = 10 * 1024 * 1024;

  /** Build a zip-entry map; object literals can't hold `i18n/en.json` style keys. */
  const zipEntries = (
    entries: [path: string, content: string][],
  ): Record<string, Uint8Array> => {
    const files: Record<string, Uint8Array> = {};
    for (const [path, content] of entries) {
      files[path] = new TextEncoder().encode(content);
    }
    return files;
  };

  it('reads the declared languages that ship a file', () => {
    const result = readPluginTranslationsFromZip(
      zipEntries([
        ['i18n/en.json', '{"A":"a"}'],
        ['i18n/de.json', '{"A":"b"}'],
        ['i18n/fr.json', '{"A":"c"}'],
      ]),
      ['en', 'de'],
      NO_LIMIT,
    );

    expect(result.translations).toEqual({ en: '{"A":"a"}', de: '{"A":"b"}' });
    expect(result.skipped).toEqual([]);
    expect(result.isOverLimit).toBeFalse();
  });

  it('counts a repeated language only once', () => {
    const content = `{"A":"${'x'.repeat(1000)}"}`;
    const result = readPluginTranslationsFromZip(
      zipEntries([['i18n/en.json', content]]),
      ['en', 'en', 'en'],
      NO_LIMIT,
    );

    expect(result.translations).toEqual({ en: content });
    expect(result.totalBytes).toBe(content.length);
  });

  it('drops an unsupported language without reporting it (the validator warns)', () => {
    const result = readPluginTranslationsFromZip(
      zipEntries([
        ['i18n/en.json', '{}'],
        ['i18n/pt-BR.json', '{}'],
      ]),
      ['en', 'pt-BR'],
      NO_LIMIT,
    );

    expect(Object.keys(result.translations)).toEqual(['en']);
    expect(result.skipped).toEqual([]);
  });

  it('reports a declared language whose file is missing from the zip', () => {
    const result = readPluginTranslationsFromZip(
      zipEntries([['i18n/en.json', '{}']]),
      ['en', 'de'],
      NO_LIMIT,
    );

    expect(Object.keys(result.translations)).toEqual(['en']);
    expect(result.skipped).toEqual([{ lang: 'de', reason: 'file-missing' }]);
  });

  it('reports and excludes a language whose json does not parse', () => {
    const result = readPluginTranslationsFromZip(
      zipEntries([
        ['i18n/en.json', '{"A":"a"}'],
        ['i18n/de.json', '{ this is not json '],
      ]),
      ['en', 'de'],
      NO_LIMIT,
    );

    expect(result.translations).toEqual({ en: '{"A":"a"}' });
    expect(result.skipped).toEqual([{ lang: 'de', reason: 'invalid-json' }]);
    expect(result.isOverLimit).toBeFalse();
  });

  it('does not treat a nested translation file as the root one', () => {
    const result = readPluginTranslationsFromZip(
      zipEntries([['nested/i18n/en.json', '{}']]),
      ['en'],
      NO_LIMIT,
    );

    expect(result.translations).toEqual({});
    expect(result.skipped).toEqual([{ lang: 'en', reason: 'file-missing' }]);
  });

  it('stops at the combined limit without decoding the rest', () => {
    const big = `{"A":"${'x'.repeat(2000)}"}`;
    const result = readPluginTranslationsFromZip(
      zipEntries([
        ['i18n/en.json', big],
        ['i18n/de.json', big],
        ['i18n/fr.json', big],
      ]),
      ['en', 'de', 'fr'],
      big.length * 2,
    );

    expect(result.isOverLimit).toBeTrue();
    // Stopped on the third file, so only the first two were ever materialized.
    expect(Object.keys(result.translations)).toEqual(['en', 'de']);
  });

  it('accepts a set exactly at the combined limit', () => {
    const content = '{"A":"a"}';
    const result = readPluginTranslationsFromZip(
      zipEntries([['i18n/en.json', content]]),
      ['en'],
      content.length,
    );

    expect(result.isOverLimit).toBeFalse();
    expect(result.translations).toEqual({ en: content });
  });
});
