import {BASE} from '../e2e.const';
import {NBrowser} from '../n-browser-interface';

const WORK_VIEW_URL = `${BASE}/`;

const DIALOG = 'dialog-view-task-reminder';
const DIALOG_TASK = `${DIALOG} .task`;
const DIALOG_TASK1 = `${DIALOG_TASK}:first-of-type`;
const DIALOG_TASK2 = `${DIALOG_TASK}:nth-of-type(2)`;
const DIALOG_TASK3 = `${DIALOG_TASK}:nth-of-type(3)`;
const TO_TODAY_SUF = ' .actions button:last-of-type';

const D_ACTIONS = `${DIALOG} mat-dialog-actions`;
const D_PLAY = `${D_ACTIONS} button:last-of-type`;

const TODAY_TASKS = 'task-list task';
const TODAY_TASK_1 = `${TODAY_TASKS}:first-of-type`;
const ADDITIONAL_WAIT_PER_REMINDER = 5000;

const SCHEDULE_WAIT_TIME = 60000;
const SCHEDULE_MAX_WAIT_TIME = SCHEDULE_WAIT_TIME + 20000;

module.exports = {
  '@tags': ['task', 'reminder', 'schedule'],

  'should display a modal with a scheduled task if due': (browser: NBrowser) => browser
    .url(WORK_VIEW_URL)
    .addTaskWithReminder({title: '0 xyz task koko', scheduleTime: Date.now()})
    .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
    .assert.elementPresent(DIALOG)
    .waitForElementVisible(DIALOG_TASK1)
    .assert.elementPresent(DIALOG_TASK1)
    .assert.containsText(DIALOG_TASK1, '0 xyz task koko')
    .end(),


  'should display a modal with 2 scheduled task if due': (browser: NBrowser) => {
    const start = Date.now();
    return browser
      .url(WORK_VIEW_URL)
      // NOTE: tasks are sorted by due time
      .addTaskWithReminder({title: '0 xyz task koko', scheduleTime: start})
      .addTaskWithReminder({title: '1 xyz task lolo', scheduleTime: start})
      .waitForElementVisible(DIALOG, SCHEDULE_MAX_WAIT_TIME)
      .assert.elementPresent(DIALOG)
      .waitForElementVisible(DIALOG_TASK1)
      .waitForElementVisible(DIALOG_TASK2, SCHEDULE_MAX_WAIT_TIME)
      .assert.containsText(DIALOG_TASK1, '0 xyz task koko')
      .assert.containsText(DIALOG_TASK2, '1 xyz task lolo')
      .end();
  },


  'should start single task': (browser: NBrowser) => browser
    .url(WORK_VIEW_URL)
    .addTaskWithReminder({title: '0 xyz task koko', scheduleTime: Date.now()})
    .waitForElementVisible(DIALOG)
    .waitForElementVisible(DIALOG_TASK1)
    .click(D_PLAY)
    .pause(100)
    .assert.cssClassPresent(TODAY_TASK_1, 'isCurrent')
    .end(),


  'should manually empty list via add to today': (browser: NBrowser) => {
    const REMINDER_DUE_FROM_NOW = (ADDITIONAL_WAIT_PER_REMINDER * 4);
    const start = Date.now() + REMINDER_DUE_FROM_NOW;
    return browser
      .url(WORK_VIEW_URL)
      // NOTE: tasks are sorted by due time
      .addTaskWithReminder({title: '0 xyz task 1234', scheduleTime: start})
      .addTaskWithReminder({title: '1 xyz task 2345', scheduleTime: start})
      .addTaskWithReminder({title: '2 xyz task 2345', scheduleTime: start})
      .waitForElementVisible(DIALOG, REMINDER_DUE_FROM_NOW + 60000)
      // wait for all tasks to be present
      .waitForElementVisible(DIALOG_TASK1, SCHEDULE_MAX_WAIT_TIME)
      .waitForElementVisible(DIALOG_TASK2, SCHEDULE_MAX_WAIT_TIME)
      .waitForElementVisible(DIALOG_TASK3, SCHEDULE_MAX_WAIT_TIME)
      .pause(100)
      .assert.containsText(DIALOG_TASK1, '0 xyz task 1234')
      .assert.containsText(DIALOG_TASK2, '1 xyz task 2345')
      .assert.containsText(DIALOG_TASK3, '2 xyz task 2345')
      .click(DIALOG_TASK1 + TO_TODAY_SUF)
      .click(DIALOG_TASK2 + TO_TODAY_SUF)
      .assert.containsText(DIALOG_TASK1, '2 xyz task 2345')
      .end();
  }
};
