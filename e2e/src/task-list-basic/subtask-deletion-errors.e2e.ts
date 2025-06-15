import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const FIRST_SUB_TASK = '.sub-tasks task:nth-child(1)';
const FIRST_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(1) textarea';
const SECOND_SUB_TASK = '.sub-tasks task:nth-child(2)';
const SECOND_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(2) textarea';
const THIRD_SUB_TASK = '.sub-tasks task:nth-child(3)';
const THIRD_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(3) textarea';
const LAST_TASK = 'task:last-child';
const LAST_TASK_TEXTAREA = 'task:last-child textarea';

module.exports = {
  '@tags': ['task', 'NEW', 'sub-task', 'deletion', 'error-check'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task with multiple subtasks': (browser: NBrowser) =>
    browser
      .addTask('Main Task for Deletion Test')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task for Deletion Test')
      // Add first subtask
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      .waitForElementVisible(SUB_TASKS_CONTAINER, 5000)
      .waitForElementVisible(FIRST_SUB_TASK, 5000)
      .sendKeys(FIRST_SUB_TASK_TEXTAREA, 'Subtask One')
      .sendKeys(FIRST_SUB_TASK_TEXTAREA, browser.Keys.ENTER)
      .pause(500)
      // Add second subtask
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      .waitForElementVisible(SECOND_SUB_TASK, 5000)
      .sendKeys(SECOND_SUB_TASK_TEXTAREA, 'Subtask Two')
      .sendKeys(SECOND_SUB_TASK_TEXTAREA, browser.Keys.ENTER)
      .pause(500)
      // Add third subtask
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      .waitForElementVisible(THIRD_SUB_TASK, 5000)
      .sendKeys(THIRD_SUB_TASK_TEXTAREA, 'Subtask Three')
      .sendKeys(THIRD_SUB_TASK_TEXTAREA, browser.Keys.ENTER)
      .pause(500)
      // Verify we have parent task with 3 subtasks
      .assert.elementPresent(LAST_TASK)
      .assert.elementPresent(FIRST_SUB_TASK)
      .assert.elementPresent(SECOND_SUB_TASK)
      .assert.elementPresent(THIRD_SUB_TASK),

  'should delete a subtask and check for errors': (browser: NBrowser) =>
    browser
      // Delete first subtask
      .click(FIRST_SUB_TASK_TEXTAREA)
      .pause(200)
      .clearValue(FIRST_SUB_TASK_TEXTAREA)
      .setValue(FIRST_SUB_TASK_TEXTAREA, browser.Keys.BACK_SPACE)
      .pause(1000)
      // Check that subtask is removed
      .assert.not.elementPresent(THIRD_SUB_TASK)
      .assert.elementPresent(FIRST_SUB_TASK) // Second becomes first
      .assert.elementPresent(SECOND_SUB_TASK) // Third becomes second
      // Check for console errors
      .perform(() => (browser as NBrowser).noError()),

  'should delete the main task and check for errors': (browser: NBrowser) =>
    browser
      // Delete the main task (parent)
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      .clearValue(LAST_TASK_TEXTAREA)
      .setValue(LAST_TASK_TEXTAREA, browser.Keys.BACK_SPACE)
      .pause(1000)
      // Check that main task and its subtasks are removed
      .execute(() => {
        const tasks = document.querySelectorAll('task');
        console.log('Tasks after main task deletion:', tasks.length);
        return tasks.length;
      })
      // Check for console errors
      .perform(() => (browser as NBrowser).noError()),

  'should reload page and check for errors': (browser: NBrowser) =>
    browser
      // Reload the page
      .refresh()
      .pause(2000)
      .waitForElementVisible('.route-wrapper')
      // Check that remaining tasks are still there
      .waitForElementVisible('task-list')
      .execute(() => {
        const tasks = document.querySelectorAll('task');
        console.log('Tasks after reload:', tasks.length);
        tasks.forEach((task, i) => {
          const textarea = task.querySelector('textarea') as HTMLTextAreaElement;
          console.log(`Task ${i}:`, textarea?.value || 'no value');
        });
        return tasks.length;
      })
      // Verify at least some tasks remain
      .assert.elementPresent(TASK_SEL)
      // Check for console errors after reload
      .perform(() => (browser as NBrowser).noError()),

  'should interact with remaining tasks without errors': (browser: NBrowser) =>
    browser
      // Add a new task to test interaction
      .addTask('New Task After Deletions')
      .waitForElementVisible(TASK_SEL)
      // Try to edit the new task
      .click(TASK_TEXTAREA)
      .pause(200)
      .clearValue(TASK_TEXTAREA)
      .setValue(TASK_TEXTAREA, 'Edited Task After Deletion')
      .sendKeys(TASK_TEXTAREA, browser.Keys.ESCAPE)
      .pause(500)
      // Verify the edit was saved
      .assert.valueContains(TASK_TEXTAREA, 'Edited Task After Deletion')
      // Final error check
      .perform(() => (browser as NBrowser).noError()),
};
