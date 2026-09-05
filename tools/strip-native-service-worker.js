'use strict';

/**
 * Deletes the Angular service-worker files from the copied native web assets.
 *
 * The service worker is never registered on Capacitor or Electron — `src/main.ts`
 * gates `ServiceWorkerModule.register` and the manual `navigator.serviceWorker
 * .register()` on `!IS_NATIVE_PLATFORM && !IS_ELECTRON`, and actively
 * *unregisters* any existing worker on those platforms. So everything the
 * service-worker builder emits is dead weight inside the APK.
 *
 * It is also non-deterministic dead weight: the Angular CLI stamps `Date.now()`
 * into `ngsw.json`, and the manifest additionally carries a `hashTable` of
 * per-file content hashes. `npx cap sync` copies the lot into
 * `assets/public/`, which is what F-Droid's reproducible-build verification
 * compares (#4155). Deleting the files retires that whole class of difference
 * rather than pinning one field of it, and drops the bytes from the APK.
 *
 * Deliberately NOT a hard failure when nothing is found: this runs inside
 * `sync:android`, and breaking the Android build over a cleanup would be a
 * worse trade than shipping the dead files for another release. The warning is
 * the signal, and the consequence of missing it is self-correcting — the files
 * come back, verification notices, and the path gets fixed.
 *
 * Usage: node ./tools/strip-native-service-worker.js <assets-dir>
 */

const fs = require('fs');
const path = require('path');

/** Everything `"serviceWorker": "ngsw-config.json"` can emit. */
const SERVICE_WORKER_FILES = [
  'ngsw.json',
  'ngsw-worker.js',
  'safety-worker.js',
  'worker-basic.min.js',
];

/**
 * @param {string} assetsDir directory holding the copied web assets
 * @returns {string[]} the files actually removed
 */
const stripServiceWorkerFiles = (assetsDir) => {
  const removed = [];
  for (const name of SERVICE_WORKER_FILES) {
    const filePath = path.join(assetsDir, name);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      removed.push(name);
    }
  }
  return removed;
};

const main = () => {
  const assetsDir = process.argv[2];
  if (!assetsDir) {
    console.error('Usage: node ./tools/strip-native-service-worker.js <assets-dir>');
    process.exit(1);
  }

  const removed = stripServiceWorkerFiles(assetsDir);
  if (removed.length === 0) {
    console.warn(
      `strip-native-service-worker: found no service-worker files in ${assetsDir}. ` +
        'If the asset layout moved, the APK is carrying them again and is no longer ' +
        'reproducible (#4155).',
    );
    return;
  }
  console.log(`strip-native-service-worker: removed ${removed.join(', ')}`);
};

if (require.main === module) {
  main();
}

module.exports = { SERVICE_WORKER_FILES, stripServiceWorkerFiles };
