import { selectPluginTranslationFiles } from './select-plugin-translation-files.util';

describe('selectPluginTranslationFiles', () => {
  const bytesOf = (content: string): Uint8Array => new TextEncoder().encode(content);

  /** Build a zip-entry map; object literals can't hold `i18n/en.json` style keys. */
  const zipEntries = (
    entries: [path: string, content: string][],
  ): Record<string, Uint8Array> => {
    const files: Record<string, Uint8Array> = {};
    for (const [path, content] of entries) {
      files[path] = bytesOf(content);
    }
    return files;
  };

  it('selects the declared languages that ship a file', () => {
    const files = zipEntries([
      ['i18n/en.json', '{"A":"a"}'],
      ['i18n/de.json', '{"A":"b"}'],
      ['i18n/fr.json', '{}'],
    ]);

    const result = selectPluginTranslationFiles(files, ['en', 'de']);

    expect(result.files).toEqual([
      { lang: 'en', bytes: files['i18n/en.json'] },
      { lang: 'de', bytes: files['i18n/de.json'] },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it('counts a repeated language only once', () => {
    const files = zipEntries([['i18n/en.json', '{"A":"a"}']]);

    const result = selectPluginTranslationFiles(files, ['en', 'en', 'en']);

    expect(result.files).toEqual([{ lang: 'en', bytes: files['i18n/en.json'] }]);
    expect(result.skipped).toEqual([]);
  });

  it('reports a declared language the app does not support', () => {
    const files = zipEntries([
      ['i18n/en.json', '{}'],
      ['i18n/pt-BR.json', '{}'],
    ]);

    const result = selectPluginTranslationFiles(files, ['en', 'pt-BR']);

    expect(result.files.map((f) => f.lang)).toEqual(['en']);
    expect(result.skipped).toEqual([{ lang: 'pt-BR', reason: 'unsupported-language' }]);
  });

  it('reports a declared language whose file is missing from the zip', () => {
    const result = selectPluginTranslationFiles(zipEntries([['i18n/en.json', '{}']]), [
      'en',
      'de',
    ]);

    expect(result.files.map((f) => f.lang)).toEqual(['en']);
    expect(result.skipped).toEqual([{ lang: 'de', reason: 'file-missing' }]);
  });

  it('does not treat a nested translation file as the root one', () => {
    const result = selectPluginTranslationFiles(
      zipEntries([['nested/i18n/en.json', '{}']]),
      ['en'],
    );

    expect(result.files).toEqual([]);
    expect(result.skipped).toEqual([{ lang: 'en', reason: 'file-missing' }]);
  });

  it('returns nothing for an empty language list', () => {
    const result = selectPluginTranslationFiles(zipEntries([['i18n/en.json', '{}']]), []);

    expect(result).toEqual({ files: [], skipped: [] });
  });
});
