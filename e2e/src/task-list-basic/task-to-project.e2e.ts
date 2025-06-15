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
  '@tags': ['task', 'NEW', 'task-organization'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create multiple tasks': (browser: NBrowser) => {
    browser
      .addTask('Task One')
      .waitForElementVisible(TASK_SEL, 5000)
      .assert.valueContains(TASK_TEXTAREA, 'Task One');
    browser.addTask('Task Two').pause(500);
    browser.addTask('Task Three').pause(500);
    // Verify all tasks exist (newest first)
    return browser.assert
      .elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Task Three')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Task Two')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Task One');
  },

  'should update a task': (browser: NBrowser) =>
    browser
      // Update the middle task
      .click(SECOND_TASK_TEXTAREA)
      .pause(200)
      .clearValue(SECOND_TASK_TEXTAREA)
      .setValue(SECOND_TASK_TEXTAREA, 'Updated Task Two')
      .pause(500)
      // Verify update
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Updated Task Two'),

  'should mark task as done': (browser: NBrowser) =>
    browser
      // Mark the first task as done
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} .task-done-btn`)
      .click(`${FIRST_TASK} .task-done-btn`)
      .pause(1000)
      // Verify remaining tasks
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated Task Two')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Task One'),

  'should add new task and verify order': (browser: NBrowser) =>
    browser
      .addTask('Task Four')
      .pause(500)
      // Verify new task is at the top
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Task Four')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Updated Task Two')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Task One'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
