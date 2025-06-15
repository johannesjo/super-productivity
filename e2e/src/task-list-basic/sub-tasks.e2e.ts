import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const SUB_TASK_TEXTAREA = `${SUB_TASKS_CONTAINER} textarea`;
const FIRST_SUB_TASK = '.sub-tasks task:nth-child(1)';
const FIRST_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(1) textarea';
const SECOND_SUB_TASK = '.sub-tasks task:nth-child(2)';
const SECOND_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(2) textarea';
const TASK_DONE_BTN = '.task-done-btn';

module.exports = {
  '@tags': ['task', 'sub-task'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should add a parent task': (browser: NBrowser) =>
    browser
      .addTask('Parent Task')
      .waitForElementVisible(TASK_SEL, 5000)
      .assert.valueContains(TASK_TEXTAREA, 'Parent Task'),

  'should add a sub task': (browser: NBrowser) =>
    browser
      .click(TASK_TEXTAREA) // Focus on the task
      .pause(200)
      .sendKeysToActiveEl('a') // Press 'a' to add sub-task
      .pause(300)
      .waitForElementVisible(SUB_TASK_TEXTAREA, 5000)
      .sendKeysToActiveEl(['Sub Task 1', browser.Keys.ENTER])
      .pause(300)
      .waitForElementVisible(FIRST_SUB_TASK, 5000)
      .assert.valueContains(FIRST_SUB_TASK_TEXTAREA, 'Sub Task 1'),

  'should add a second sub task': (browser: NBrowser) =>
    browser
      .sendKeysToActiveEl(['Sub Task 2', browser.Keys.ENTER])
      .pause(300)
      .waitForElementVisible(SECOND_SUB_TASK, 5000)
      .assert.valueContains(SECOND_SUB_TASK_TEXTAREA, 'Sub Task 2'),

  'should mark sub task as done': (browser: NBrowser) =>
    browser
      .moveToElement(FIRST_SUB_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_SUB_TASK} ${TASK_DONE_BTN}`, 5000)
      .click(`${FIRST_SUB_TASK} ${TASK_DONE_BTN}`)
      .pause(500)
      .assert.hasClass(FIRST_SUB_TASK, 'isDone'),

  'should delete sub task': (browser: NBrowser) =>
    browser
      // Focus on the second sub-task (since first is marked as done)
      .click(SECOND_SUB_TASK_TEXTAREA)
      .pause(200)
      // Clear the text first
      .clearValue(SECOND_SUB_TASK_TEXTAREA)
      // Press backspace to delete the empty sub-task
      .sendKeysToActiveEl(browser.Keys.BACK_SPACE)
      .pause(500)
      // Verify only one sub-task remains
      .assert.elementPresent(FIRST_SUB_TASK)
      .assert.not.elementPresent(SECOND_SUB_TASK),

  'should collapse and expand sub tasks': (browser: NBrowser) =>
    browser
      // Click outside to unfocus
      .click('body')
      .pause(500)
      // Verify sub-tasks are collapsed
      .assert.not.elementPresent(SUB_TASK_TEXTAREA)
      // Click on parent task to expand
      .click(TASK_TEXTAREA)
      .pause(200)
      // Try pressing 'a' again to see sub-task area
      .setValue('body', 'a')
      .pause(300)
      .waitForElementVisible(SUB_TASK_TEXTAREA, 5000),
};
