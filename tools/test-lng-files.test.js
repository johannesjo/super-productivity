'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  collectLeafKeys,
  compareTranslationKeys,
  inspectTranslationDirectory,
  printError,
  printReport,
} = require('./test-lng-files');

test('collectLeafKeys returns sorted dot-delimited paths for nested leaves', () => {
  assert.deepEqual(
    collectLeafKeys({
      task: {
        title: 'Title',
        details: {
          notes: 'Notes',
          dueDate: 'Due date',
        },
      },
      common: {
        save: 'Save',
      },
    }),
    ['common.save', 'task.details.dueDate', 'task.details.notes', 'task.title'],
  );
});

test('compareTranslationKeys reports sorted nested missing and unnecessary keys', () => {
  const reference = {
    common: {
      cancel: 'Cancel',
      save: 'Save',
    },
    task: {
      title: 'Title',
    },
  };
  const translation = {
    common: {
      cancel: 'Abbrechen',
      delete: 'Löschen',
    },
    obsolete: {
      label: 'Veraltet',
    },
    task: {
      title: 'Titel',
    },
  };

  assert.deepEqual(compareTranslationKeys(reference, translation), {
    missingKeys: ['common.save'],
    unnecessaryKeys: ['common.delete', 'obsolete.label'],
  });
});

test('compareTranslationKeys treats object-versus-leaf differences as structural mismatches', () => {
  const reference = {
    settings: {
      theme: {
        label: 'Theme',
      },
    },
  };
  const translation = {
    settings: {
      theme: 'Theme',
    },
  };

  assert.deepEqual(compareTranslationKeys(reference, translation), {
    missingKeys: ['settings.theme.label'],
    unnecessaryKeys: ['settings.theme'],
  });
});

test('inspectTranslationDirectory compares every locale with deterministic order and totals', () => {
  const directory = mkdtempSync(join(tmpdir(), 'test-lng-files-'));

  try {
    const writeJson = (file, value) => {
      writeFileSync(join(directory, file), JSON.stringify(value));
    };

    writeJson('zh.json', {
      common: {
        cancel: '取消',
        save: '保存',
      },
      task: {
        title: '标题',
      },
    });
    writeJson('fr.json', {
      common: {
        cancel: 'Annuler',
      },
    });
    writeJson('en.json', {
      task: {
        title: 'Title',
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
      },
    });
    writeJson('de.json', {
      task: {
        title: 'Titel',
      },
      common: {
        cancel: 'Abbrechen',
        delete: 'Löschen',
      },
    });
    writeFileSync(join(directory, 'README.txt'), 'not a locale');

    assert.deepEqual(inspectTranslationDirectory(directory), {
      referenceKeyCount: 3,
      files: [
        {
          file: 'de.json',
          missingKeys: ['common.save'],
          unnecessaryKeys: ['common.delete'],
        },
        {
          file: 'fr.json',
          missingKeys: ['common.save', 'task.title'],
          unnecessaryKeys: [],
        },
        {
          file: 'zh.json',
          missingKeys: [],
          unnecessaryKeys: [],
        },
      ],
      totalMissing: 3,
      totalUnnecessary: 1,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('inspectTranslationDirectory identifies the locale containing invalid JSON', () => {
  const directory = mkdtempSync(join(tmpdir(), 'test-lng-files-'));

  try {
    writeFileSync(join(directory, 'en.json'), '{"common":{"save":"Save"}}');
    writeFileSync(join(directory, 'de.json'), '{"common":{"save":');

    assert.throws(
      () => inspectTranslationDirectory(directory),
      /Unable to parse .*de\.json/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('inspectTranslationDirectory ignores .json directories and checks locale files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'test-lng-files-'));

  try {
    writeFileSync(
      join(directory, 'en.json'),
      '{"common":{"cancel":"Cancel","save":"Save"}}',
    );
    writeFileSync(join(directory, 'de.json'), '{"common":{"save":"Speichern"}}');
    mkdirSync(join(directory, 'ignored.json'));

    assert.deepEqual(inspectTranslationDirectory(directory), {
      referenceKeyCount: 2,
      files: [
        {
          file: 'de.json',
          missingKeys: ['common.cancel'],
          unnecessaryKeys: [],
        },
      ],
      totalMissing: 1,
      totalUnnecessary: 0,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('printReport keeps adversarial values on inert output lines', (t) => {
  const output = [];
  t.mock.method(console, 'log', (...values) => {
    output.push(values.map(String).join(' '));
  });

  printReport({
    referenceKeyCount: 1,
    files: [
      {
        file: '::error file=secret::forged\nname\r\x1b[31m.json',
        missingKeys: ['error.message\n::warning::forged\r\x00\x1b[2J'],
        unnecessaryKeys: [],
      },
    ],
    totalMissing: 1,
    totalUnnecessary: 0,
  });

  assert.equal(output.length, 3);
  for (const line of output) {
    assert.doesNotMatch(line, /[\u0000-\u001f\u007f-\u009f]/u);
  }
  assert.doesNotMatch(output.join('\n'), /(^|\n)::/u);
});

test('printReport bounds keys while retaining three examples and the remainder', (t) => {
  const output = [];
  t.mock.method(console, 'log', (...values) => {
    output.push(values.map(String).join(' '));
  });
  const veryLongKey = `first.${'x'.repeat(10_000)}`;

  printReport({
    referenceKeyCount: 5,
    files: [
      {
        file: 'de.json',
        missingKeys: [
          veryLongKey,
          'second.example',
          'third.example',
          'fourth.omitted',
          'fifth.omitted',
        ],
        unnecessaryKeys: [],
      },
    ],
    totalMissing: 5,
    totalUnnecessary: 0,
  });

  const [fileLine] = output;
  assert.match(fileLine, /first\./u);
  assert.match(fileLine, /second\.example/u);
  assert.match(fileLine, /third\.example/u);
  assert.doesNotMatch(fileLine, /fourth\.omitted|fifth\.omitted/u);
  assert.match(fileLine, /… 2 more/u);
  assert.ok(fileLine.length < 1_000, `report line was ${fileLine.length} characters`);
  assert.ok(!fileLine.includes(veryLongKey));
});

test('printError preserves useful context in one bounded inert line', (t) => {
  const output = [];
  t.mock.method(console, 'error', (...values) => {
    output.push(values.map(String).join(' '));
  });
  const localeFile = 'de.json';
  const parseReason = 'Unexpected token } at position 17';
  const longDirectory = `/tmp/${'nested/'.repeat(2_000)}details`;
  const error = new Error(
    `${localeFile}: ${parseReason}\r\n::error::\x1b[31m\x00\u202e ${longDirectory}`,
  );

  printError(error);

  assert.equal(output.length, 1);
  const [line] = output;
  assert.ok(line.length < 1_000, `error line was ${line.length} characters`);
  assert.match(line, /de\.json/u);
  assert.match(line, /Unexpected token \} at position 17/u);
  assert.doesNotMatch(
    line,
    /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/u,
  );
  assert.doesNotMatch(output.join('\n'), /(^|[\r\n])::/u);
});
