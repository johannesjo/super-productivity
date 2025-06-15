import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['task', 'simple-subtask'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create subtask with keyboard shortcut': (browser: NBrowser) =>
    browser
      .addTask('Parent Task')
      .waitForElementVisible('task')
      // After adding task, the textarea should be focused
      // Send 'a' directly to create subtask
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(1000)
      // Now type the subtask content directly
      .perform(() =>
        (browser as NBrowser).sendKeysToActiveEl(['Sub Task 1', browser.Keys.ENTER]),
      )
      .pause(1000)
      .waitForElementVisible('task .sub-tasks')
      .waitForElementVisible('task .sub-tasks task')
      .assert.valueContains('task .sub-tasks task textarea', 'Sub Task 1'),
};
