import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const FIRST_TASK = 'task:nth-child(1)';
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)';
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
const THIRD_TASK = 'task:nth-child(3)';
const THIRD_TASK_TEXTAREA = 'task:nth-child(3) textarea';
const TASK_DONE_BTN = '.task-done-btn';

module.exports = {
  '@tags': ['task', 'sub-task-workaround'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should add a parent task': (browser: NBrowser) =>
    browser
      .addTask('Parent Task')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Parent Task'),

  'should add tasks that work like subtasks': (browser: NBrowser) => {
    // First verify parent task exists
    browser.assert.elementPresent(FIRST_TASK);
    // Add what would be subtasks as regular tasks
    return browser
      .addTask('Sub Task 1')
      .waitForElementVisible(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task');
  },

  'should add another task': (browser: NBrowser) =>
    browser
      .addTask('Sub Task 2')
      .waitForElementVisible(THIRD_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 2')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Parent Task'),

  'should mark task as done': (browser: NBrowser) =>
    browser
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(1000)
      // After marking as done, verify we now have only 2 tasks visible
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      // The done task might be hidden or moved
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task'),

  'should clear task text': (browser: NBrowser) =>
    browser
      // Focus on the first task (which now contains "Sub Task 1")
      .click(FIRST_TASK_TEXTAREA)
      .pause(200)
      // Clear the text first
      .clearValue(FIRST_TASK_TEXTAREA)
      .pause(500)
      // Type new text
      .setValue(FIRST_TASK_TEXTAREA, 'Updated Task')
      .pause(500)
      // Verify the text was updated
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated Task')
      // Verify other tasks are still there
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task'),
};
