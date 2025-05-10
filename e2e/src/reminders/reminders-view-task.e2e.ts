import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should display a modal with a scheduled task if due': (browser: NBrowser) =>
    browser
      .addTaskWithReminder({ title: '0 A task', scheduleTime: Date.now() })
      .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
      .assert.elementPresent(DIALOG)
      .waitForElementVisible(DIALOG_TASK1)
      .assert.elementPresent(DIALOG_TASK1)
      .assert.textContains(DIALOG_TASK1, '0 A task'),
};
