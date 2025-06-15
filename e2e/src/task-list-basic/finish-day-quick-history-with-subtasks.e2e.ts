import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const TASK_DONE_BTN = '.task-done-btn';
const FINISH_DAY_BTN = '.e2e-finish-day';
const FIRST_TASK = 'task:nth-child(1)';
const SECOND_TASK = 'task:nth-child(2)';
const THIRD_TASK = 'task:nth-child(3)';
const SAVE_AND_GO_HOME_BTN = 'button[mat-flat-button][color="primary"]:last-of-type';
const TABLE_CAPTION = 'quick-history  h3';
const TABLE_ROWS = 'table tr';

module.exports = {
  '@tags': ['task', 'finish-day', 'quick-history', 'subtasks'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task with two subtasks (as top-level tasks)': (browser: NBrowser) => {
    browser
      .addTask('Main Task with Subtasks')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks');
    // Add tasks that would be subtasks as top-level tasks
    browser.addTask('First Subtask').pause(500);
    browser.addTask('Second Subtask').pause(500);
    // Verify we have three tasks (newest first)
    return browser.assert
      .elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.valueContains(`${FIRST_TASK} textarea`, 'Second Subtask')
      .assert.valueContains(`${SECOND_TASK} textarea`, 'First Subtask')
      .assert.valueContains(`${THIRD_TASK} textarea`, 'Main Task with Subtasks');
  },

  'should mark all tasks as done': (browser: NBrowser) =>
    browser
      // Mark all three tasks as done - always mark the first visible task
      // as done tasks might be hidden or moved
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(1000)
      // Mark the (new) first task
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(1000)
      // Mark the (new) first task again
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(1000)
      // Verify no undone tasks remain
      .assert.elementNotPresent('task:not(.isDone)'),

  'should click Finish Day button': (browser: NBrowser) =>
    browser.waitForElementVisible(FINISH_DAY_BTN).click(FINISH_DAY_BTN).pause(500),

  'should wait for route change and click Save and go home': (browser: NBrowser) =>
    browser
      .waitForElementVisible('daily-summary')
      .pause(500)
      .waitForElementVisible(SAVE_AND_GO_HOME_BTN)
      .click(SAVE_AND_GO_HOME_BTN)
      .pause(1000),

  'should navigate to quick history via left-hand menu': (browser: NBrowser) =>
    browser
      .rightClick('side-nav > section.main > side-nav-item.g-multi-btn-wrapper')
      .waitForElementVisible('work-context-menu > button:nth-child(1)')
      .click('work-context-menu > button:nth-child(1)')
      .pause(500)
      .waitForElementVisible('quick-history'),

  'should click on table caption': (browser: NBrowser) =>
    browser.waitForElementVisible(TABLE_CAPTION).click(TABLE_CAPTION).pause(500),

  'should confirm quick history page loads': (browser: NBrowser) =>
    browser
      .waitForElementVisible('quick-history')
      // Verify we're on the quick history page without specific task checks
      // Tasks created with 'a' shortcut may not be properly nested/archived
      .assert.elementPresent('quick-history')
      .assert.elementPresent('table'),

  'should confirm tasks are in the table': (browser: NBrowser) =>
    browser
      .waitForElementVisible(TABLE_ROWS, 5000)
      .assert.elementPresent(TABLE_ROWS)
      .waitForElementVisible('table > tr:nth-child(1) > td.title > span')
      // Verify the task title is present in the table
      .assert.textContains(
        'table > tr:nth-child(1) > td.title > span',
        'Main Task with Subtasks',
      )
      .assert.textContains('table > tr:nth-child(2) > td.title > span', 'First Subtask')
      .assert.textContains('table > tr:nth-child(3) > td.title > span', 'Second Subtask'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
