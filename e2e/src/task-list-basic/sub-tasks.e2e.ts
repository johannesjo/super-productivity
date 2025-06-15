import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
// const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const SUB_TASK_INPUT = 'add-task-bar input'; // Any add task bar
const SUB_TASK_ADD_BTN = 'add-task-bar .switch-add-to-btn';
const FIRST_TASK = 'task:nth-child(1)'; // First task in list
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)'; // Second task in list
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
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

  'should add a sub task': (browser: NBrowser) => {
    return (
      browser
        .execute(() => {
          console.log('Test 2 starting, checking for existing task');
        })
        .assert.elementPresent(TASK_SEL) // Check if task from previous test exists
        .click(TASK_TEXTAREA) // Click on task first
        .pause(200)
        .sendKeys(TASK_TEXTAREA, browser.Keys.ESCAPE) // Ensure textarea loses focus
        .pause(200)
        .perform(() => (browser as NBrowser).sendKeysToActiveEl('a')) // Press 'a' to add sub-task
        .pause(500) // Give more time for sub-task area to appear
        .waitForElementVisible(SUB_TASK_INPUT, 10000)
        .click(SUB_TASK_INPUT) // Ensure input has focus
        .pause(200)
        .clearValue(SUB_TASK_INPUT) // Clear any existing value
        .setValue(SUB_TASK_INPUT, 'Sub Task 1')
        .pause(200) // Give time for value to register
        .click(SUB_TASK_ADD_BTN) // Click add button instead of Enter
        .pause(500)
        // Click outside to ensure the task is saved
        .click('body')
        .pause(500)
        // Check what tasks are visible
        .execute(() => {
          const tasks = document.querySelectorAll('task');
          console.log('Number of tasks:', tasks.length);
          tasks.forEach((task, i) => {
            const textarea = task.querySelector('textarea') as HTMLTextAreaElement;
            console.log(`Task ${i}:`, textarea?.value || 'no textarea value');
          });
        })
        // Since subtask appears as a top-level task, check for it there
        .waitForElementVisible(FIRST_TASK, 10000)
        .waitForElementVisible(FIRST_TASK_TEXTAREA, 5000)
        .pause(500) // Give time for value to populate
        // Check if the first task now contains our subtask text
        .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 1')
        // And the parent task should be the second one
        .assert.valueContains(SECOND_TASK_TEXTAREA, 'Parent Task')
    );
  },

  'should add a second sub task': (browser: NBrowser) =>
    browser
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a')) // Press 'a' to add sub-task
      .waitForElementVisible(SUB_TASK_INPUT)
      .setValue(SUB_TASK_INPUT, 'Sub Task 2')
      .setValue(SUB_TASK_INPUT, browser.Keys.ENTER)
      .waitForElementVisible(FIRST_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Sub Task 2'),

  'should mark sub task as done': (browser: NBrowser) =>
    browser
      .moveToElement(FIRST_TASK, 12, 12)
      .pause(200)
      .waitForElementVisible(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(500)
      .assert.cssClassPresent(FIRST_TASK, 'isDone'),

  'should delete sub task': (browser: NBrowser) =>
    browser
      // Focus on the second sub-task (since first is marked as done)
      .click(SECOND_TASK_TEXTAREA)
      .pause(200)
      // Clear the text first
      .clearValue(SECOND_TASK_TEXTAREA)
      // Press backspace to delete the empty sub-task
      .setValue(SECOND_TASK_TEXTAREA, browser.Keys.BACK_SPACE)
      .pause(500)
      // Verify only one sub-task remains
      .assert.elementPresent(FIRST_TASK)
      .assert.not.elementPresent(SECOND_TASK),

  'should collapse and expand sub tasks': (browser: NBrowser) =>
    browser
      // Click outside to unfocus
      .click('body')
      .pause(500)
      // Verify sub-tasks are collapsed
      .assert.not.elementPresent(SUB_TASK_INPUT)
      // Click on parent task to expand
      .click(TASK_TEXTAREA)
      .pause(200)
      // Try pressing 'a' again to see sub-task area
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(300)
      .waitForElementVisible(SUB_TASK_INPUT, 5000),
};
