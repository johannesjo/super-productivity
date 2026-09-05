'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  SERVICE_WORKER_FILES,
  stripServiceWorkerFiles,
} = require('./strip-native-service-worker');

const withAssetsDir = (files, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-strip-'));
  try {
    for (const name of files) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('removes every service-worker file the builder can emit', () => {
  withAssetsDir(SERVICE_WORKER_FILES, (dir) => {
    assert.deepEqual(stripServiceWorkerFiles(dir), SERVICE_WORKER_FILES);
    assert.deepEqual(fs.readdirSync(dir), []);
  });
});

test('leaves every other asset alone', () => {
  // The whole web bundle lives in this directory; only the four are ours.
  withAssetsDir(
    ['ngsw.json', 'index.html', 'main-ABC123.js', 'styles-DEF456.css'],
    (dir) => {
      assert.deepEqual(stripServiceWorkerFiles(dir), ['ngsw.json']);
      assert.deepEqual(fs.readdirSync(dir).sort(), [
        'index.html',
        'main-ABC123.js',
        'styles-DEF456.css',
      ]);
    },
  );
});

test('reports nothing removed when the files are absent', () => {
  // Drives the warning: an empty result is how a moved asset layout surfaces.
  withAssetsDir(['index.html'], (dir) => {
    assert.deepEqual(stripServiceWorkerFiles(dir), []);
  });
});

test('is idempotent', () => {
  withAssetsDir(SERVICE_WORKER_FILES, (dir) => {
    stripServiceWorkerFiles(dir);
    assert.deepEqual(stripServiceWorkerFiles(dir), []);
  });
});

test('a missing assets directory is not an error', () => {
  // `cap sync` creates the directory; if it did not run, that is its failure to
  // report, not ours to crash on.
  assert.deepEqual(
    stripServiceWorkerFiles(path.join(os.tmpdir(), 'no-such-assets-dir-here')),
    [],
  );
});
