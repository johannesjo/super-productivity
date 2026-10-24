const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('ts-node/register/transpile-only');

const { resolveUserDataDir, applyUserDataDir } = require('./user-data-dir.ts');

const SNAP_ENV = {
  SNAP: '/snap/superproductivity/4925',
  SNAP_USER_COMMON: '/home/u/snap/superproductivity/common',
  SNAP_USER_DATA: '/home/u/snap/superproductivity/4925',
};

const resolve = (overrides) =>
  resolveUserDataDir({
    argv: ['electron', '.'],
    env: {},
    platform: 'linux',
    appName: 'superProductivity',
    ...overrides,
  });

test('snap uses the common dir shared by all revisions (#11049)', () => {
  assert.deepEqual(resolve({ env: SNAP_ENV }), {
    dir: path.join(SNAP_ENV.SNAP_USER_COMMON, '.config', 'superProductivity'),
    reason: 'snap',
  });
});

test('--user-data-dir wins over the snap common dir, without trailing slashes', () => {
  assert.deepEqual(
    resolve({ env: SNAP_ENV, argv: ['electron', '--user-data-dir=/x/y//'] }),
    {
      dir: '/x/y',
      reason: 'arg',
    },
  );
});

test('keeps the default outside snap and on other platforms', () => {
  assert.equal(resolve({}), undefined);
  assert.equal(resolve({ env: SNAP_ENV, platform: 'darwin' }), undefined);
  assert.equal(resolve({ env: { SNAP: SNAP_ENV.SNAP } }), undefined);
});

// Electron puts the singleton lock in the userData dir current at
// requestSingleInstanceLock(); main.ts must set the dir first (#11049).
test('applyUserDataDir sets userData and the snap logs path', () => {
  const calls = [];
  const app = {
    getName: () => 'superProductivity',
    setPath: (name, dir) => calls.push(['setPath', name, dir]),
    setAppLogsPath: () => calls.push(['setAppLogsPath']),
  };
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...SNAP_ENV };
  try {
    applyUserDataDir(app);
  } finally {
    process.env = originalEnv;
  }
  if (process.platform !== 'linux') {
    assert.deepEqual(calls, []);
    return;
  }
  assert.deepEqual(calls, [
    [
      'setPath',
      'userData',
      path.join(SNAP_ENV.SNAP_USER_COMMON, '.config', 'superProductivity'),
    ],
    ['setAppLogsPath'],
  ]);
});

test('main.ts sets userData before requesting the single-instance lock', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  const applyAt = src.indexOf('applyUserDataDir(app)');
  const lockAt = src.indexOf('requestSingleInstanceLock(');
  assert.ok(applyAt > -1 && lockAt > -1);
  assert.ok(applyAt < lockAt);
});
