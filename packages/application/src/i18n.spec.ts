import { describe, expect, it } from 'vitest';
import './locales/en';
import './locales/de';
import {
  createTranslator,
  localeCodes,
  missingKeys,
  registerLocale,
  resolveDict,
  translate,
} from './i18n';

describe('i18n framework', () => {
  it('resolves the base locale and interpolates parameters', () => {
    const t = createTranslator('en');
    expect(t('focus.title')).toBe('Focus');
    expect(t('nav.tasks')).toBe('Tasks');
    expect(t('workspace.openTasks', { count: 3 })).toBe('3 open tasks');
  });

  it('falls back to the base locale for missing keys', () => {
    const t = createTranslator('de');
    // 'settings.shortcuts' exists only in en -> fallback
    expect(t('settings.shortcuts')).toBe('Shortcuts');
    expect(t('nav.focus')).toBe('Fokus');
  });

  it('falls back to the raw key when unknown', () => {
    expect(translate(resolveDict('en'), 'totally.unknown.thing')).toBe(
      'totally.unknown.thing',
    );
  });

  it('registers and lists locales, and validates en completeness', () => {
    expect(localeCodes()).toContain('en');
    expect(localeCodes()).toContain('de');
    expect(missingKeys(resolveDict('en'))).toEqual([]);
  });

  it('supports regional variants with a language base', () => {
    registerLocale({
      code: 'en-GB',
      language: 'en',
      dict: { 'focus.title': 'Focus timer' },
    });
    const t = createTranslator('en-GB');
    expect(t('focus.title')).toBe('Focus timer');
    expect(t('nav.tasks')).toBe('Tasks');
  });
});
