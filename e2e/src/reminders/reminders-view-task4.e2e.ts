import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;

const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const DIALOG_TASK3 = `${DIALOG_TASK}:nth-of-type(3)`;
const TO_TODAY_SUF = ' .actions button:last-of-type';

const SCHEDULE_MAX_WAIT_TIME = 180000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should manually empty list via add to today': (browser: NBrowser) => {
    const start = Date.now() + 100000;
    return (
      browser
        // NOTE: tasks are sorted by due time
        .addTaskWithReminder({ title: '0 D task xyz', scheduleTime: start })
        .addTaskWithReminder({ title: '1 D task xyz', scheduleTime: start })
        .addTaskWithReminder({ title: '2 D task xyz', scheduleTime: Date.now() })
        .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME + 120000)
        // wait for all tasks to be present
        .waitForElementVisible(DIALOG_TASK1, SCHEDULE_MAX_WAIT_TIME + 120000)
        .waitForElementVisible(DIALOG_TASK2, SCHEDULE_MAX_WAIT_TIME + 120000)
        .waitForElementVisible(DIALOG_TASK3, SCHEDULE_MAX_WAIT_TIME + 120000)
        .pause(100)
        .assert.textContains(DIALOG_TASKS_WRAPPER, '0 D task xyz')
        .assert.textContains(DIALOG_TASKS_WRAPPER, '1 D task xyz')
        .assert.textContains(DIALOG_TASKS_WRAPPER, '2 D task xyz')
        .click(DIALOG_TASK1 + TO_TODAY_SUF)
        .click(DIALOG_TASK2 + TO_TODAY_SUF)
        .pause(50)
        .assert.textContains(DIALOG_TASK1, 'D task xyz')
    );
  },
};
