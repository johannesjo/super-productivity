'use strict';

// Binds the two places an Android URL scheme action has to agree:
//
//   AndroidManifest.xml  ──host──▶  parse-app-uri-{task,quick}-action.ts
//
// Android routes custom-scheme URLs per declared host, so an action the parsers
// recognize but the manifest does not declare builds and ships fine and simply
// never reaches the app. That is how add-task / today / inbox stayed iOS-only.
// Karma specs run in a browser and cannot read `android/`, so this lives here.
//
// Regex rather than an XML parser: the project forbids adding dependencies, and
// the manifest is small and hand-maintained.

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');
const readRoot = (...p) => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r\n/g, '\n');

const SCHEME = 'com.super-productivity.app';

const MANIFEST = readRoot('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const TASK_PARSER = readRoot(
  'src',
  'app',
  'features',
  'tasks',
  'util',
  'parse-app-uri-task-action.ts',
);
const QUICK_PARSER = readRoot(
  'src',
  'app',
  'core',
  'app-uri-actions',
  'parse-app-uri-quick-action.ts',
);

// Comments are stripped so a host named in prose cannot satisfy the check.
const DECLARED_HOSTS = new Set(
  [
    ...MANIFEST.replace(/<!--[\s\S]*?-->/g, '').matchAll(
      /<data\s+android:scheme="([^"]+)"\s+android:host="([^"]+)"\s*\/>/g,
    ),
  ]
    .filter((m) => m[1] === SCHEME)
    .map((m) => m[2]),
);

const QUICK_ACTION_HOSTS = (() => {
  const match = QUICK_PARSER.match(/QUICK_ACTION_HOSTS = \[([^\]]*)\]/);
  assert.ok(match, 'QUICK_ACTION_HOSTS not found as an array literal in the parser');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
})();

const TASK_ACTION_HOSTS = (() => {
  const match = TASK_PARSER.match(/if \(action !== '([^']+)' && action !== '([^']+)'\)/);
  assert.ok(match, 'task action guard not found in parse-app-uri-task-action.ts');
  return [match[1], match[2]];
})();

test('the manifest declares hosts on the app scheme', () => {
  assert.ok(DECLARED_HOSTS.size > 0, `no <data> hosts for ${SCHEME} in the manifest`);
});

test('every task action host is declared in the manifest', () => {
  TASK_ACTION_HOSTS.forEach((host) =>
    assert.ok(DECLARED_HOSTS.has(host), `${SCHEME}://${host} is not declared`),
  );
});

test('every UI action host is declared in the manifest', () => {
  assert.ok(QUICK_ACTION_HOSTS.length > 0, 'QUICK_ACTION_HOSTS is empty');
  QUICK_ACTION_HOSTS.forEach((host) =>
    assert.ok(DECLARED_HOSTS.has(host), `${SCHEME}://${host} is not declared`),
  );
});
