const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node/register/transpile-only');

const originalLoad = Module._load;
const overlays = [];
const counts = [];
Module._load = function (request, parent, isMain) {
  if (request === 'electron')
    return {
      app: { setBadgeCount: (count) => counts.push(count) },
      nativeImage: {
        createFromDataURL: (dataUrl) => ({
          dataUrl,
          isEmpty: () => dataUrl === 'invalid',
          getSize: () => ({ width: dataUrl === 'oversized' ? 256 : 64, height: 64 }),
        }),
      },
    };
  if (request === './main-window')
    return {
      getWin: () => ({ setOverlayIcon: (...args) => overlays.push(args) }),
    };
  return originalLoad.call(this, request, parent, isMain);
};
const { setDueTaskBadge } = require('./due-task-badge.ts');
Module._load = originalLoad;

test('publishes the count and removes the native badge at zero', () => {
  setDueTaskBadge(5, 'test-png');
  setDueTaskBadge(0);
  if (process.platform === 'win32') {
    assert.equal(overlays[0][1], '5 tasks due today or overdue');
    assert.equal(overlays[0][0].dataUrl, 'test-png');
    assert.deepEqual(overlays[1], [null, '']);
  } else {
    assert.deepEqual(counts, [5, 0]);
  }
});

test('rejects missing, undecodable or incorrectly sized Windows badge images', () => {
  if (process.platform !== 'win32') return;
  const previousCalls = overlays.length;
  for (const image of [undefined, 'invalid', 'oversized']) setDueTaskBadge(5, image);
  assert.equal(overlays.length, previousCalls);
});
