'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getAndroidVersionInfo } = require('./release-notes');
const { computeDevVersionCode, BAND_SIZE } = require('./android-dev-version-code');

// 18.13.1 -> 1_813_019_000 (release code), next version base 18.13.2 -> 1_813_020_000.
const RELEASE_18_13_1 = getAndroidVersionInfo('18.13.1').versionCode;
const NEXT_VERSION_BASE = getAndroidVersionInfo('18.13.2').versionCode - 9000;

test('release code and next-version base match the documented band', () => {
  assert.equal(RELEASE_18_13_1, 1813019000);
  assert.equal(NEXT_VERSION_BASE, 1813020000);
});

test('a dev build lands one slot above the release', () => {
  assert.deepEqual(computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: 1 }), {
    skip: false,
    code: 1813019001,
  });
});

test('the code increments monotonically with the commit count', () => {
  const a = computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: 10 }).code;
  const b = computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: 11 }).code;
  assert.equal(a, 1813019010);
  assert.ok(b > a);
});

test('the top of the band stays strictly below the next version base', () => {
  const { code } = computeDevVersionCode({
    baseCode: RELEASE_18_13_1,
    commits: BAND_SIZE - 1,
  });
  assert.equal(code, 1813019999);
  assert.ok(code < NEXT_VERSION_BASE, 'dev code must not reach the next version base');
});

test('commits==0 (HEAD is the release commit) skips instead of reusing the release code', () => {
  const r = computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: 0 });
  assert.equal(r.skip, true);
});

test('band exhaustion skips (with a reason) rather than colliding with the next version', () => {
  const r = computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: BAND_SIZE });
  assert.equal(r.skip, true);
  assert.match(r.reason, /exhausted/);
});

test('invalid inputs throw (so main() degrades to a skip)', () => {
  assert.throws(() => computeDevVersionCode({ baseCode: 0, commits: 1 }));
  assert.throws(() => computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: -1 }));
  assert.throws(() => computeDevVersionCode({ baseCode: RELEASE_18_13_1, commits: 1.5 }));
});
