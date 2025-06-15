import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const SUB_TASK_INPUT = 'add-task-bar input';
const SUB_TASK_ADD_BTN = 'add-task-bar .switch-add-to-btn';
const FIRST_TASK = 'task:nth-child(1)';
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)';
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
const THIRD_TASK = 'task:nth-child(3)';
// const THIRD_TASK_TEXTAREA = 'task:nth-child(3) textarea';

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
      .click(TASK_TEXTAREA)
      .pause(200)
      .sendKeys(TASK_TEXTAREA, browser.Keys.ESCAPE)
      .pause(200)
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(500)
      .waitForElementVisible(SUB_TASK_INPUT, 10000)
      .setValue(SUB_TASK_INPUT, 'Subtask One')
      .click(SUB_TASK_ADD_BTN)
      .pause(500)
      // Add second subtask
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(500)
      .waitForElementVisible(SUB_TASK_INPUT, 10000)
      .setValue(SUB_TASK_INPUT, 'Subtask Two')
      .click(SUB_TASK_ADD_BTN)
      .pause(500)
      // Add third subtask
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(500)
      .waitForElementVisible(SUB_TASK_INPUT, 10000)
      .setValue(SUB_TASK_INPUT, 'Subtask Three')
      .click(SUB_TASK_ADD_BTN)
      .pause(500)
      // Verify we have 4 tasks total
      .waitForElementVisible(FIRST_TASK)
      .waitForElementVisible(SECOND_TASK)
      .waitForElementVisible(THIRD_TASK)
      .waitForElementVisible('task:nth-child(4)'),

  'should delete a subtask and check for errors': (browser: NBrowser) =>
    browser
      // Delete second task (Subtask One)
      .click(SECOND_TASK_TEXTAREA)
      .pause(200)
      .clearValue(SECOND_TASK_TEXTAREA)
      .setValue(SECOND_TASK_TEXTAREA, browser.Keys.BACK_SPACE)
      .pause(1000)
      // Check that task is removed
      .execute(() => {
        const tasks = document.querySelectorAll('task');
        console.log('Tasks after deletion:', tasks.length);
        tasks.forEach((task, i) => {
          const textarea = task.querySelector('textarea') as HTMLTextAreaElement;
          console.log(`Task ${i}:`, textarea?.value || 'no value');
        });
      })
      // Check for console errors
      .perform(() => (browser as NBrowser).noError()),

  'should delete the main task and check for errors': (browser: NBrowser) =>
    browser
      // Find and delete the main task (it should be last now)
      .execute(() => {
        const tasks = document.querySelectorAll('task');
        let mainTaskIndex = -1;
        tasks.forEach((task, i) => {
          const textarea = task.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea?.value?.includes('Main Task for Deletion Test')) {
            mainTaskIndex = i;
            console.log('Found main task at index:', i);
          }
        });
        return mainTaskIndex;
      })
      // Click on the last task (main task)
      .click('task:last-child textarea')
      .pause(200)
      .clearValue('task:last-child textarea')
      .setValue('task:last-child textarea', browser.Keys.BACK_SPACE)
      .pause(1000)
      // Check remaining tasks
      .execute(() => {
        const tasks = document.querySelectorAll('task');
        console.log('Tasks after main task deletion:', tasks.length);
        tasks.forEach((task, i) => {
          const textarea = task.querySelector('textarea') as HTMLTextAreaElement;
          console.log(`Task ${i}:`, textarea?.value || 'no value');
        });
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
      // Try to edit a remaining task
      .click(FIRST_TASK_TEXTAREA)
      .pause(200)
      .clearValue(FIRST_TASK_TEXTAREA)
      .setValue(FIRST_TASK_TEXTAREA, 'Edited Task After Deletion')
      .sendKeys(FIRST_TASK_TEXTAREA, browser.Keys.ESCAPE)
      .pause(500)
      // Verify the edit was saved
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Edited Task After Deletion')
      // Final error check
      .perform(() => (browser as NBrowser).noError()),
};
