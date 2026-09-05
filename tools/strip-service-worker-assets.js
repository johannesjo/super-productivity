'use strict';

/**
 * Deletes the Angular service-worker files from a built web-asset directory.
 *
 * Two callers, both deleting files nothing will execute:
 *
 * - `sync:android`, after `cap sync` has copied the bundle into the APK's
 *   `assets/public/`. The service worker is never registered on Capacitor or
 *   Electron — `src/main.ts` gates both registration paths on
 *   `!IS_NATIVE_PLATFORM && !IS_ELECTRON` and actively *unregisters* any
 *   existing worker there — so the files are dead weight. They are also
 *   non-deterministic dead weight: the CLI stamps `Date.now()` into
 *   `ngsw.json`, which is what F-Droid's reproducible-build verification
 *   compares (#4155).
 * - the Lighthouse CI job, which strips the same files from `dist/browser` so
 *   the audit runs without a service worker.
 *
 * The list is exact for `@angular/build` v21: `execute-post-bundle` writes
 * `ngsw.json` flat at the browser-output root (never hashed, never nested),
 * and `augmentAppWithServiceWorkerCore` copies `ngsw-worker.js` plus, when
 * present, `safety-worker.js` under both its own name and `worker-basic.min.js`.
 *
 * Usage: node ./tools/strip-service-worker-assets.js <target-dir> [source-dir]
 *
 * `source-dir` is the build output the target was copied from. Given it, a
 * target missing `ngsw.json` while the source still has one means the copy
 * path moved — unambiguous, and a hard error, because a silent no-op here is
 * indistinguishable from success and would quietly put the manifest back in
 * the APK. Without it, finding nothing is only a warning: the service worker
 * may legitimately be disabled for that build.
 */

const fs = require('fs');
const path = require('path');

/** Every file `"serviceWorker": "ngsw-config.json"` emits (Angular v21). */
const SERVICE_WORKER_FILES = [
  'ngsw.json',
  'ngsw-worker.js',
  'safety-worker.js',
  'worker-basic.min.js',
];

/** The only one of them that is non-deterministic, and so the one that matters. */
const MANIFEST = 'ngsw.json';

/**
 * @param {string} assetsDir directory holding the built web assets
 * @returns {{ removed: string[], failed: { name: string, message: string }[] }}
 */
const stripServiceWorkerFiles = (assetsDir) => {
  const removed = [];
  const failed = [];
  for (const name of SERVICE_WORKER_FILES) {
    const filePath = path.join(assetsDir, name);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    try {
      // `force` swallows a file that vanished between the check and here; any
      // real failure (EACCES, EPERM from a Windows file watcher, EISDIR) is
      // caught rather than taking the build down over a cleanup.
      fs.rmSync(filePath, { force: true });
    } catch (e) {
      failed.push({ name, message: e.message });
      continue;
    }
    removed.push(name);
  }
  return { removed, failed };
};

const main = () => {
  const [targetDir, sourceDir] = process.argv.slice(2);
  if (!targetDir) {
    console.error(
      'Usage: node ./tools/strip-service-worker-assets.js <target-dir> [source-dir]',
    );
    process.exit(1);
  }

  const { removed, failed } = stripServiceWorkerFiles(targetDir);

  for (const { name, message } of failed) {
    console.warn(`strip-service-worker-assets: could not remove ${name} — ${message}`);
  }

  const sourceHasManifest = !!sourceDir && fs.existsSync(path.join(sourceDir, MANIFEST));
  if (sourceHasManifest && removed.indexOf(MANIFEST) === -1) {
    // Not ambiguous: the build emitted a manifest, so the copy should have one.
    console.error(
      `strip-service-worker-assets: ${sourceDir} has ${MANIFEST} but ${targetDir} did ` +
        'not — the asset copy path moved, so the manifest is shipping again and the ' +
        'build is no longer reproducible (#4155). Fix the path rather than dropping ' +
        'this step.',
    );
    process.exit(1);
  }

  if (removed.length === 0) {
    console.warn(
      `strip-service-worker-assets: no service-worker files in ${targetDir} ` +
        '(expected if the service worker is disabled for this build).',
    );
    return;
  }
  console.log(`strip-service-worker-assets: removed ${removed.join(', ')}`);
};

if (require.main === module) {
  main();
}

module.exports = { SERVICE_WORKER_FILES, MANIFEST, stripServiceWorkerFiles };
