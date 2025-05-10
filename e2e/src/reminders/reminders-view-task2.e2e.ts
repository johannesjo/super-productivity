import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;

const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should display a modal with 2 scheduled task if due': (browser: NBrowser) => {
    return (
      browser
        // NOTE: tasks are sorted by due time
        .addTaskWithReminder({ title: '0 B task' })
        .addTaskWithReminder({ title: '1 B task', scheduleTime: Date.now() })
        .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
        .assert.elementPresent(DIALOG)
        .waitForElementVisible(DIALOG_TASK1, SCHEDULE_MAX_WAIT_TIME)
        .waitForElementVisible(DIALOG_TASK2, SCHEDULE_MAX_WAIT_TIME)
        .assert.textContains(DIALOG_TASKS_WRAPPER, '0 B task')
        .assert.textContains(DIALOG_TASKS_WRAPPER, '1 B task')
    );
  },
};
