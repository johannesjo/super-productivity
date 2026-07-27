'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const afterPack = require('./afterPack');
const { compareIconsets, verifyIconset, verifyIcns } = require('./verify-mac-icon');

const ICON_PATH = join(__dirname, '..', 'build', 'icon.icns');
const ICONSET_PATH = join(__dirname, '..', 'build', 'icon.iconset');
const GENERIC_SMALL_ICON = join(__dirname, '..', 'build', 'icons', '16x16.png');

test('checked-in macOS icon sources contain every standard representation', () => {
  assert.doesNotThrow(() => verifyIconset(ICONSET_PATH));
  assert.doesNotThrow(() => verifyIcns(readFileSync(ICON_PATH), ICON_PATH, ICONSET_PATH));
});

test('macOS icon verification rejects corrupt PNG data', () => {
  const corruptIcon = Buffer.from(readFileSync(ICON_PATH));
  const pngOffset = corruptIcon.indexOf(Buffer.from('89504e470d0a1a0a', 'hex'));
  assert.notEqual(pngOffset, -1);
  corruptIcon[pngOffset + 29] ^= 1;

  assert.throws(() => verifyIcns(corruptIcon, 'corrupt.icns'), /invalid PNG IHDR CRC/);
});

test('macOS icon verification rejects the full-bleed generic small artwork', (t) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'sp-mac-iconset-test-'));
  const actualIconset = join(temporaryDirectory, 'icon.iconset');
  cpSync(ICONSET_PATH, actualIconset, { recursive: true });
  copyFileSync(GENERIC_SMALL_ICON, join(actualIconset, 'icon_16x16.png'));
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

  assert.throws(
    () => compareIconsets(ICONSET_PATH, actualIconset),
    /fully transparent pixels/,
  );
});

for (const electronPlatformName of ['darwin', 'mas']) {
  test(`afterPack verifies the icon copied into a ${electronPlatformName} app`, async (t) => {
    const appOutDir = mkdtempSync(join(tmpdir(), 'sp-mac-icon-test-'));
    const resourcesDir = join(
      appOutDir,
      'Super Productivity.app',
      'Contents',
      'Resources',
    );
    mkdirSync(resourcesDir, { recursive: true });
    copyFileSync(ICON_PATH, join(resourcesDir, 'icon.icns'));
    t.after(() => rmSync(appOutDir, { recursive: true, force: true }));

    await assert.doesNotReject(() =>
      afterPack({
        electronPlatformName,
        appOutDir,
        packager: { appInfo: { productFilename: 'Super Productivity' } },
      }),
    );
  });
}
