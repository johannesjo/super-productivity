import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const FIRST_TASK = 'task:nth-child(1)';
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)';
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
const THIRD_TASK = 'task:nth-child(3)';
const THIRD_TASK_TEXTAREA = 'task:nth-child(3) textarea';

module.exports = {
  '@tags': ['task', 'NEW', 'sub-task', 'tags'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task with sub tasks (as top-level tasks)': (browser: NBrowser) => {
    browser
      .addTask('Main Task with Subtasks')
      .waitForElementVisible(TASK_SEL, 5000)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks');
    // Add a task that would be a subtask
    browser.addTask('First Subtask').pause(500);
    // Verify both tasks exist
    return browser
      .waitForElementVisible(FIRST_TASK, 5000)
      .waitForElementVisible(SECOND_TASK, 5000)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'First Subtask')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Main Task with Subtasks');
  },

  'should update first task': (browser: NBrowser) =>
    browser
      // Click on the first task to select it
      .click(FIRST_TASK_TEXTAREA)
      .pause(200)
      // Clear and update text
      .clearValue(FIRST_TASK_TEXTAREA)
      .setValue(FIRST_TASK_TEXTAREA, 'Updated First Subtask')
      .pause(500)
      // Verify update
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated First Subtask'),

  'should update second task': (browser: NBrowser) =>
    browser
      // Click on the second task (main task)
      .click(SECOND_TASK_TEXTAREA)
      .pause(200)
      // Clear and update text
      .clearValue(SECOND_TASK_TEXTAREA)
      .setValue(SECOND_TASK_TEXTAREA, 'Updated Main Task')
      .pause(500)
      // Verify update
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Updated Main Task'),

  'should add a third task': (browser: NBrowser) =>
    browser
      .addTask('Third Task')
      .pause(500)
      // Verify all three tasks exist
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Third Task')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Updated First Subtask')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Updated Main Task'),

  'should mark a task as done': (browser: NBrowser) =>
    browser
      // Mark the first task as done
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} .task-done-btn`)
      .click(`${FIRST_TASK} .task-done-btn`)
      .pause(1000)
      // Verify tasks rearranged
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated First Subtask')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Updated Main Task'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
