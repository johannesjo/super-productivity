import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const WORK_VIEW_URL = `${BASE}/`;

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASKS_WRAPPER = `${DIALOG} .tasks`;

const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const DIALOG_TASK3 = `${DIALOG_TASK}:nth-of-type(3)`;
const TO_TODAY_SUF = ' .actions button:last-of-type';

const D_ACTIONS = `${DIALOG} mat-dialog-actions`;
const D_PLAY = `${D_ACTIONS} button:last-of-type`;

const TODAY_TASKS = 'task-list task';
const TODAY_TASK_1 = `${TODAY_TASKS}:first-of-type`;

const SCHEDULE_MAX_WAIT_TIME = 180000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],

  'should display a modal with a scheduled task if due': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .addTaskWithReminder({ title: '0 A task', scheduleTime: Date.now() })
      .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
      .assert.elementPresent(DIALOG)
      .waitForElementVisible(DIALOG_TASK1)
      .assert.elementPresent(DIALOG_TASK1)
      .assert.containsText(DIALOG_TASK1, '0 A task')
      .end(),

  'should display a modal with 2 scheduled task if due': (browser: NBrowser) => {
    return (
      browser
        .url(WORK_VIEW_URL)
        // NOTE: tasks are sorted by due time
        .addTaskWithReminder({ title: '0 B task' })
        .addTaskWithReminder({ title: '1 B task', scheduleTime: Date.now() })
        .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
        .assert.elementPresent(DIALOG)
        .waitForElementVisible(DIALOG_TASK1, SCHEDULE_MAX_WAIT_TIME)
        .waitForElementVisible(DIALOG_TASK2, SCHEDULE_MAX_WAIT_TIME)
        .assert.containsText(DIALOG_TASKS_WRAPPER, '0 B task')
        .assert.containsText(DIALOG_TASKS_WRAPPER, '1 B task')
        .end()
    );
  },

  'should start single task': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .addTaskWithReminder({ title: '0 C task', scheduleTime: Date.now() })
      .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
      .waitForElementVisible(DIALOG_TASK1)
      .click(D_PLAY)
      .pause(100)
      .assert.cssClassPresent(TODAY_TASK_1, 'isCurrent')
      .end(),

  'should manually empty list via add to today': (browser: NBrowser) => {
    const start = Date.now() + 100000;
    return (
      browser
        .url(WORK_VIEW_URL)
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
        .assert.containsText(DIALOG_TASKS_WRAPPER, '0 D task xyz')
        .assert.containsText(DIALOG_TASKS_WRAPPER, '1 D task xyz')
        .assert.containsText(DIALOG_TASKS_WRAPPER, '2 D task xyz')
        .click(DIALOG_TASK1 + TO_TODAY_SUF)
        .click(DIALOG_TASK2 + TO_TODAY_SUF)
        .pause(50)
        .assert.containsText(DIALOG_TASK1, 'D task xyz')
        .end()
    );
  },
};
