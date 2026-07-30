'use strict';

const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const BASE_PATH = join(__dirname, '..', 'src', 'assets', 'i18n');
const EXAMPLE_LIMIT = 3;
const LOG_VALUE_LIMIT = 120;
const INVISIBLE_LOG_CHARACTERS =
  /[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/gu;

const collectLeafKeys = (value) => {
  const keys = [];

  const visit = (current, prefix) => {
    if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      for (const [key, child] of Object.entries(current)) {
        visit(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }

    if (prefix) keys.push(prefix);
  };

  visit(value, '');
  return keys.sort();
};

const compareKeyLists = (referenceKeys, referenceKeySet, translationKeys) => {
  const translationKeySet = new Set(translationKeys);

  return {
    missingKeys: referenceKeys.filter((key) => !translationKeySet.has(key)),
    unnecessaryKeys: translationKeys.filter((key) => !referenceKeySet.has(key)),
  };
};

const compareTranslationKeys = (reference, translation) => {
  const referenceKeys = collectLeafKeys(reference);
  const translationKeys = collectLeafKeys(translation);

  return compareKeyLists(referenceKeys, new Set(referenceKeys), translationKeys);
};

// Same pattern ngx-translate interpolates with (names may be dotted).
const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/gu;

const collectPlaceholders = (value) =>
  typeof value === 'string'
    ? [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort()
    : [];

// Brace syntax that cannot interpolate cleanly: a run of 3+ braces
// ("{{{name}}") or unbalanced "{{"/"}}" pairs ("{{name}"). Placeholder-set
// drift is informational (the parameter just goes missing from the text), but
// broken braces render literally to the user, so they fail the run the same
// way malformed JSON does.
const findBraceDefect = (value) => {
  if (typeof value !== 'string') return null;
  if (/\{{3,}|\}{3,}/.test(value)) return 'brace run';
  const opens = (value.match(/\{\{/g) ?? []).length;
  const closes = (value.match(/\}\}/g) ?? []).length;
  return opens === closes ? null : 'unbalanced braces';
};

const getValueAtPath = (object, dottedKey) =>
  dottedKey.split('.').reduce((current, key) => current?.[key], object);

// Only keys present in both files are compared: a missing key falls back to
// the English value (already reported as drift), and an unnecessary key is
// never rendered.
const comparePlaceholders = (reference, translation, sharedKeys) => {
  const placeholderMismatches = [];
  const malformedKeys = [];

  for (const key of sharedKeys) {
    const translationValue = getValueAtPath(translation, key);
    const defect = findBraceDefect(translationValue);
    if (defect) malformedKeys.push(`${key} (${defect})`);

    const referencePlaceholders = collectPlaceholders(getValueAtPath(reference, key));
    const translationPlaceholders = collectPlaceholders(translationValue);
    if (referencePlaceholders.join('\n') !== translationPlaceholders.join('\n')) {
      placeholderMismatches.push(key);
    }
  }

  return { placeholderMismatches, malformedKeys };
};

const readTranslationFile = (directory, file) => {
  const filePath = join(directory, file);
  const contents = readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse ${file}: ${message} (${filePath})`);
  }
};

const inspectTranslationDirectory = (directory) => {
  const reference = readTranslationFile(directory, 'en.json');
  const referenceKeys = collectLeafKeys(reference);
  const referenceKeySet = new Set(referenceKeys);
  const files = readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'en.json',
    )
    .map((entry) => entry.name)
    .sort()
    .map((file) => {
      const translation = readTranslationFile(directory, file);
      const translationKeys = collectLeafKeys(translation);
      const sharedKeys = translationKeys.filter((key) => referenceKeySet.has(key));

      return {
        file,
        ...compareKeyLists(referenceKeys, referenceKeySet, translationKeys),
        ...comparePlaceholders(reference, translation, sharedKeys),
      };
    });

  return {
    referenceKeyCount: referenceKeys.length,
    files,
    totalMissing: files.reduce((total, file) => total + file.missingKeys.length, 0),
    totalUnnecessary: files.reduce(
      (total, file) => total + file.unnecessaryKeys.length,
      0,
    ),
    totalPlaceholderMismatches: files.reduce(
      (total, file) => total + file.placeholderMismatches.length,
      0,
    ),
    totalMalformed: files.reduce((total, file) => total + file.malformedKeys.length, 0),
  };
};

const formatLogValue = (value) => {
  const characters = [...String(value)];
  const preview =
    characters.length > LOG_VALUE_LIMIT
      ? `${characters.slice(0, LOG_VALUE_LIMIT).join('')}…`
      : characters.join('');

  return JSON.stringify(preview).replace(INVISIBLE_LOG_CHARACTERS, (character) => {
    const codePoint = character.codePointAt(0).toString(16).padStart(4, '0');
    return `\\u${codePoint}`;
  });
};

const formatExamples = (keys) => {
  if (keys.length === 0) return '';

  const examples = keys.slice(0, EXAMPLE_LIMIT).map(formatLogValue).join(', ');
  const remaining = keys.length - EXAMPLE_LIMIT;
  return ` (${examples}${remaining > 0 ? `, … ${remaining} more` : ''})`;
};

const printReport = (report) => {
  for (const file of report.files) {
    const missing = file.missingKeys.length;
    const unnecessary = file.unnecessaryKeys.length;
    const mismatched = file.placeholderMismatches.length;
    const malformed = file.malformedKeys.length;

    if (missing === 0 && unnecessary === 0 && mismatched === 0 && malformed === 0) {
      console.log(`${formatLogValue(file.file)}: OK`);
      continue;
    }

    console.log(
      `${formatLogValue(file.file)}: ${missing} missing${formatExamples(file.missingKeys)}; ` +
        `${unnecessary} not in en.json${formatExamples(file.unnecessaryKeys)}; ` +
        `${mismatched} placeholder mismatches${formatExamples(file.placeholderMismatches)}; ` +
        `${malformed} broken braces${formatExamples(file.malformedKeys)}`,
    );
  }

  console.log(
    `Checked ${report.files.length} translation files against en.json ` +
      `(${report.referenceKeyCount} keys): ${report.totalMissing} missing, ` +
      `${report.totalUnnecessary} not in en.json, ` +
      `${report.totalPlaceholderMismatches} placeholder mismatches, ` +
      `${report.totalMalformed} broken braces.`,
  );
  console.log(
    'Key differences and placeholder mismatches are informational; ' +
      'missing translations use the English fallback.',
  );
  if (report.totalMalformed > 0) {
    console.error('Broken placeholder braces render literally to the user; fix them.');
  }
};

const printError = (error) => {
  console.error(formatLogValue(error instanceof Error ? error.message : error));
};

if (require.main === module) {
  try {
    const report = inspectTranslationDirectory(BASE_PATH);
    printReport(report);
    if (report.totalMalformed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    printError(error);
    process.exitCode = 1;
  }
}

module.exports = {
  collectLeafKeys,
  collectPlaceholders,
  compareTranslationKeys,
  findBraceDefect,
  inspectTranslationDirectory,
  printError,
  printReport,
};
