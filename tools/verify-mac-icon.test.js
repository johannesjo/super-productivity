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
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { crc32, deflateSync } = require('node:zlib');
const afterPack = require('./afterPack');
const { resolveNpmInvocation } = require('./generate-mac-icon');
const { compareIconsets, verifyIconset, verifyIcns } = require('./verify-mac-icon');

const ICON_PATH = join(__dirname, '..', 'build', 'icon.icns');
const ICONSET_PATH = join(__dirname, '..', 'build', 'icon.iconset');
const GENERIC_SMALL_ICON = join(__dirname, '..', 'build', 'icons', '16x16.png');

test('macOS icon generator launches npm through Node on Windows', () => {
  const npmExecPath = String.raw`C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`;
  const nodeExecutable = String.raw`C:\Program Files\nodejs\node.exe`;

  assert.deepEqual(
    resolveNpmInvocation({
      platform: 'win32',
      npmExecPath,
      nodeExecutable,
    }),
    {
      command: nodeExecutable,
      prefixArgs: [npmExecPath],
    },
  );
});

test('checked-in macOS icon sources contain every standard representation', () => {
  assert.doesNotThrow(() => verifyIconset(ICONSET_PATH));
  assert.doesNotThrow(() => verifyIcns(readFileSync(ICON_PATH), ICON_PATH, ICONSET_PATH));
});

test('macOS icon verification rejects unchecked legacy small-icon payloads', () => {
  const legacyIcon = Buffer.from(readFileSync(ICON_PATH));
  assert.equal(legacyIcon.toString('ascii', 8, 12), 'icp4');
  legacyIcon.write('ic04', 8, 4, 'ascii');
  legacyIcon.fill(0, 16, 24);

  assert.throws(
    () => verifyIcns(legacyIcon, 'legacy.icns', ICONSET_PATH),
    /legacy.*ic04|ic04.*legacy/i,
  );
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

const pngChunk = (type, data) => {
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
};

const encodePng = (size, pixels) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const rowLength = size * 4;
  const filtered = Buffer.alloc((rowLength + 1) * size);
  for (let row = 0; row < size; row++) {
    pixels.copy(
      filtered,
      row * (rowLength + 1) + 1,
      row * rowLength,
      (row + 1) * rowLength,
    );
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(filtered)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

// Move one channel of one anti-aliased pixel by exactly `levels` steps in
// premultiplied space — the same kind of drift the iconutil round trip
// introduces (one level) and real artwork regressions exceed (many levels).
const shiftChannelByPremultipliedLevels = (decoded, levels) => {
  const pixels = Buffer.from(decoded.pixels);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    if (alpha < 32 || alpha === 255) continue;
    for (let channel = 0; channel < 3; channel++) {
      const premultiplied = Math.round((pixels[offset + channel] * alpha) / 255);
      if (premultiplied <= levels) continue;
      const shifted = Math.round(((premultiplied - levels) * 255) / alpha);
      if (Math.round((shifted * alpha) / 255) !== premultiplied - levels) continue;
      pixels[offset + channel] = shifted;
      return pixels;
    }
  }
  throw new Error('no shiftable anti-aliased pixel found in iconset');
};

const writeShiftedSmallIcon = (directory, levels) => {
  const actualIconset = join(directory, 'icon.iconset');
  cpSync(ICONSET_PATH, actualIconset, { recursive: true });
  const decoded = verifyIconset(ICONSET_PATH).get('icon_16x16.png');
  const pixels = shiftChannelByPremultipliedLevels(decoded, levels);
  writeFileSync(join(actualIconset, 'icon_16x16.png'), encodePng(16, pixels));
  return actualIconset;
};

test('macOS icon comparison tolerates one level of premultiplied rounding noise', (t) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'sp-mac-iconset-test-'));
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

  const actualIconset = writeShiftedSmallIcon(temporaryDirectory, 1);
  assert.doesNotThrow(() => compareIconsets(ICONSET_PATH, actualIconset));
});

test('macOS icon comparison rejects artwork drift beyond rounding noise', (t) => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'sp-mac-iconset-test-'));
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

  const actualIconset = writeShiftedSmallIcon(temporaryDirectory, 8);
  assert.throws(() => compareIconsets(ICONSET_PATH, actualIconset), /artwork differs/);
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

test('afterPack rejects a packaged macOS icon that differs from the source', async (t) => {
  const sourceIcon = readFileSync(ICON_PATH);
  const packagedIcon = Buffer.alloc(sourceIcon.length + 9);
  sourceIcon.copy(packagedIcon);
  packagedIcon.writeUInt32BE(packagedIcon.length, 4);
  packagedIcon.write('name', sourceIcon.length, 4, 'ascii');
  packagedIcon.writeUInt32BE(9, sourceIcon.length + 4);

  const appOutDir = mkdtempSync(join(tmpdir(), 'sp-mac-icon-test-'));
  const resourcesDir = join(appOutDir, 'Super Productivity.app', 'Contents', 'Resources');
  mkdirSync(resourcesDir, { recursive: true });
  writeFileSync(join(resourcesDir, 'icon.icns'), packagedIcon);
  t.after(() => rmSync(appOutDir, { recursive: true, force: true }));

  await assert.rejects(
    () =>
      afterPack({
        electronPlatformName: 'darwin',
        appOutDir,
        packager: { appInfo: { productFilename: 'Super Productivity' } },
      }),
    /does not match/,
  );
});
