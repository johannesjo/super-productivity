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
    .map((file) => ({
      file,
      ...compareKeyLists(
        referenceKeys,
        referenceKeySet,
        collectLeafKeys(readTranslationFile(directory, file)),
      ),
    }));

  return {
    referenceKeyCount: referenceKeys.length,
    files,
    totalMissing: files.reduce((total, file) => total + file.missingKeys.length, 0),
    totalUnnecessary: files.reduce(
      (total, file) => total + file.unnecessaryKeys.length,
      0,
    ),
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

    if (missing === 0 && unnecessary === 0) {
      console.log(`${formatLogValue(file.file)}: OK`);
      continue;
    }

    console.log(
      `${formatLogValue(file.file)}: ${missing} missing${formatExamples(file.missingKeys)}; ` +
        `${unnecessary} not in en.json${formatExamples(file.unnecessaryKeys)}`,
    );
  }

  console.log(
    `Checked ${report.files.length} translation files against en.json ` +
      `(${report.referenceKeyCount} keys): ${report.totalMissing} missing, ` +
      `${report.totalUnnecessary} not in en.json.`,
  );
  console.log(
    'Key differences are informational; missing translations use the English fallback.',
  );
};

const printError = (error) => {
  console.error(formatLogValue(error instanceof Error ? error.message : error));
};

if (require.main === module) {
  try {
    printReport(inspectTranslationDirectory(BASE_PATH));
  } catch (error) {
    printError(error);
    process.exitCode = 1;
  }
}

module.exports = {
  collectLeafKeys,
  compareTranslationKeys,
  inspectTranslationDirectory,
  printError,
  printReport,
};
