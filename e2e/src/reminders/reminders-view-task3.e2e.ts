import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const DIALOG = 'dialog-view-task-reminder';

const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;

const D_ACTIONS = `${DIALOG} mat-dialog-actions`;
const D_PLAY = `${D_ACTIONS} button:last-of-type`;

const TODAY_TASKS = 'task-list task';
const TODAY_TASK_1 = `${TODAY_TASKS}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should start single task': (browser: NBrowser) =>
    browser
      .addTaskWithReminder({ title: '0 C task', scheduleTime: Date.now() })
      .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
      .waitForElementVisible(DIALOG_TASK1)
      .click(D_PLAY)
      .pause(100)
      .assert.hasClass(TODAY_TASK_1, 'isCurrent'),
};
