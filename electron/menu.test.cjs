const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register/transpile-only');

const { createMenuTemplate } = require('./menu.ts');

const buildTpl = () => {
  const calls = { close: 0, quit: 0 };
  const tpl = createMenuTemplate({
    onCloseWindow: () => calls.close++,
    onQuit: () => calls.quit++,
  });
  return { tpl, calls };
};

const findMenu = (tpl, label) => tpl.find((item) => item.label === label);

test('has app, edit and window menus', () => {
  const { tpl } = buildTpl();
  assert.deepEqual(
    tpl.map((item) => item.label),
    ['Super Productivity', 'Edit', 'Window'],
  );
});

test('Cmd+W is a custom Close Window item wired to onCloseWindow', () => {
  const { tpl, calls } = buildTpl();
  const windowMenu = findMenu(tpl, 'Window');
  assert.equal(windowMenu.submenu.length, 1);
  const closeItem = windowMenu.submenu[0];
  assert.equal(closeItem.label, 'Close Window');
  assert.equal(closeItem.accelerator, 'CmdOrCtrl+W');
  assert.equal(closeItem.role, undefined);
  closeItem.click();
  assert.equal(calls.close, 1);
  assert.equal(calls.quit, 0);
});

// role 'close' would route Cmd+W into the window close handler, which quits
// the app when minimize-to-tray is off; roles also target the focused window
// (task widget, break blocker). Guard against them coming back.
test('window menu contains no close/minimize/zoom roles', () => {
  const { tpl } = buildTpl();
  const windowMenu = findMenu(tpl, 'Window');
  const roles = windowMenu.submenu.map((item) => item.role).filter(Boolean);
  assert.deepEqual(roles, []);
});

test('quit item keeps Cmd+Q and is wired to onQuit', () => {
  const { tpl, calls } = buildTpl();
  const appMenu = findMenu(tpl, 'Super Productivity');
  const quitItem = appMenu.submenu.find((item) => item.label === 'Quit');
  assert.equal(quitItem.accelerator, 'CmdOrCtrl+Q');
  quitItem.click();
  assert.equal(calls.quit, 1);
  assert.equal(calls.close, 0);
});

test('edit menu keeps the copy & paste roles', () => {
  const { tpl } = buildTpl();
  const editMenu = findMenu(tpl, 'Edit');
  const roles = editMenu.submenu.map((item) => item.role).filter(Boolean);
  assert.deepEqual(roles, ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);
});
