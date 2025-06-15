import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const FIRST_TASK = 'task:nth-child(1)';
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)';
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
// const THIRD_TASK = 'task:nth-child(3)';
// const THIRD_TASK_TEXTAREA = 'task:nth-child(3) textarea';
const TASK_DONE_BTN = '.task-done-btn';
const LAST_TASK = 'task:last-child';
const LAST_TASK_TEXTAREA = 'task:last-child textarea';

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

  'should add a sub task': (browser: NBrowser) =>
    browser
      // Click on the parent task to focus it
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      // Press 'a' to add a subtask (creates empty task immediately)
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      // New empty subtask should appear and be focused
      // Wait for the new task to appear in the subtasks container
      .waitForElementVisible(SUB_TASKS_CONTAINER, 5000)
      .waitForElementVisible(`${SUB_TASKS_CONTAINER} ${FIRST_TASK}`, 5000)
      // Type directly into the focused textarea
      .sendKeys(`${SUB_TASKS_CONTAINER} ${FIRST_TASK_TEXTAREA}`, 'Sub Task 1')
      .pause(200)
      // Press Enter to save
      .sendKeys(`${SUB_TASKS_CONTAINER} ${FIRST_TASK_TEXTAREA}`, browser.Keys.ENTER)
      .pause(500)
      // Verify the subtask was created
      .assert.valueContains(
        `${SUB_TASKS_CONTAINER} ${FIRST_TASK_TEXTAREA}`,
        'Sub Task 1',
      ),

  'should add a second sub task': (browser: NBrowser) =>
    browser
      // Click on parent task to focus it
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      // Press 'a' to add another subtask
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      // New empty subtask should appear
      .waitForElementVisible(`${SUB_TASKS_CONTAINER} ${SECOND_TASK}`, 5000)
      // Type into the new subtask
      .sendKeys(`${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`, 'Sub Task 2')
      .sendKeys(`${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`, browser.Keys.ENTER)
      .pause(500)
      .assert.valueContains(
        `${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`,
        'Sub Task 2',
      ),

  'should mark sub task as done': (browser: NBrowser) =>
    browser
      .moveToElement(`${SUB_TASKS_CONTAINER} ${FIRST_TASK}`, 12, 12)
      .pause(200)
      .waitForElementVisible(`${SUB_TASKS_CONTAINER} ${FIRST_TASK} ${TASK_DONE_BTN}`)
      .click(`${SUB_TASKS_CONTAINER} ${FIRST_TASK} ${TASK_DONE_BTN}`)
      .pause(500)
      .assert.cssClassPresent(`${SUB_TASKS_CONTAINER} ${FIRST_TASK}`, 'isDone'),

  'should delete sub task': (browser: NBrowser) =>
    browser
      // Focus on the second sub-task
      .click(`${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`)
      .pause(200)
      // Clear the text first
      .clearValue(`${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`)
      // Press backspace to delete the empty sub-task
      .setValue(`${SUB_TASKS_CONTAINER} ${SECOND_TASK_TEXTAREA}`, browser.Keys.BACK_SPACE)
      .pause(500)
      // Verify only one sub-task remains
      .assert.elementPresent(`${SUB_TASKS_CONTAINER} ${FIRST_TASK}`)
      .assert.not.elementPresent(`${SUB_TASKS_CONTAINER} ${SECOND_TASK}`),

  'should collapse and expand sub tasks': (browser: NBrowser) =>
    browser
      // Find toggle button on parent task
      .moveToElement(LAST_TASK, 12, 12)
      .pause(200)
      // Click toggle to collapse
      .click(`${LAST_TASK} .sub-task-toggle-btn`)
      .pause(500)
      // Verify sub-tasks are not visible
      .assert.not.visible(SUB_TASKS_CONTAINER)
      // Click toggle again to expand
      .click(`${LAST_TASK} .sub-task-toggle-btn`)
      .pause(500)
      // Verify sub-tasks are visible again
      .assert.visible(SUB_TASKS_CONTAINER)
      .assert.elementPresent(`${SUB_TASKS_CONTAINER} ${FIRST_TASK}`),
};
