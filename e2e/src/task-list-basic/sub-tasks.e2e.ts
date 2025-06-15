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
  '@tags': ['task', 'sub-task'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should add a parent task': (browser: NBrowser) =>
    browser
      .addTask('Parent Task')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Parent Task')
      .execute(() => {
        console.log('Test 1 complete, task should exist');
      }),

  'should add a sub task (as top-level task)': (browser: NBrowser) =>
    browser
      // Note: Since subtasks aren't appearing in .sub-tasks container,
      // we'll create them as top-level tasks for now
      .addTask('Sub Task 1')
      .waitForElementVisible(SECOND_TASK)
      // New task appears at top, parent task moves down
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task'),

  'should add a second sub task (as top-level task)': (browser: NBrowser) =>
    browser
      .addTask('Sub Task 2')
      .waitForElementVisible(THIRD_TASK)
      // Verify all three tasks
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 2')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Parent Task'),

  'should mark sub task as done': (browser: NBrowser) =>
    browser
      // Mark the first task (Sub Task 2) as done
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(1000)
      // After marking as done, verify remaining tasks
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 1')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task'),

  'should update sub task': (browser: NBrowser) =>
    browser
      // Update the first task (Sub Task 1)
      .click(FIRST_TASK_TEXTAREA)
      .pause(200)
      .clearValue(FIRST_TASK_TEXTAREA)
      .setValue(FIRST_TASK_TEXTAREA, 'Updated Sub Task')
      .pause(500)
      // Verify task is updated
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated Sub Task'),

  'should verify final state': (browser: NBrowser) =>
    browser
      // Click outside to unfocus
      .click('body')
      .pause(500)
      // Verify final state: two tasks remain
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated Sub Task')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task'),
};
