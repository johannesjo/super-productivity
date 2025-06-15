import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const FIRST_TASK = 'task:nth-child(1)';
const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
const SECOND_TASK = 'task:nth-child(2)';
const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
const THIRD_TASK = 'task:nth-child(3)';
const THIRD_TASK_TEXTAREA = 'task:nth-child(3) textarea';
const FOURTH_TASK = 'task:nth-child(4)';
const FOURTH_TASK_TEXTAREA = 'task:nth-child(4) textarea';

module.exports = {
  '@tags': ['task', 'NEW', 'sub-task', 'deletion', 'error-check'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task with multiple subtasks (as top-level tasks)': (
    browser: NBrowser,
  ) => {
    browser
      .addTask('Main Task for Deletion Test')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task for Deletion Test');
    // Add tasks that would be subtasks
    browser.addTask('Subtask One').pause(500);
    browser.addTask('Subtask Two').pause(500);
    browser.addTask('Subtask Three').pause(500);
    // Verify we have 4 tasks total (newest first)
    return browser.assert
      .elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.elementPresent(FOURTH_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Subtask Three')
      .assert.valueContains(SECOND_TASK_TEXTAREA, 'Subtask Two')
      .assert.valueContains(THIRD_TASK_TEXTAREA, 'Subtask One')
      .assert.valueContains(FOURTH_TASK_TEXTAREA, 'Main Task for Deletion Test');
  },

  'should update a subtask and check for errors': (browser: NBrowser) =>
    browser
      // Update first task (Subtask Three)
      .click(FIRST_TASK_TEXTAREA)
      .pause(200)
      .clearValue(FIRST_TASK_TEXTAREA)
      .setValue(FIRST_TASK_TEXTAREA, 'Updated Subtask Three')
      .pause(1000)
      // Check that task is updated
      .assert.elementPresent(FOURTH_TASK)
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.valueContains(FIRST_TASK_TEXTAREA, 'Updated Subtask Three')
      // Check for console errors
      .perform(() => (browser as NBrowser).noError()),

  'should update the main task and check for errors': (browser: NBrowser) =>
    browser
      // Update the last task (Main Task for Deletion Test)
      .click(FOURTH_TASK_TEXTAREA)
      .pause(200)
      .clearValue(FOURTH_TASK_TEXTAREA)
      .setValue(FOURTH_TASK_TEXTAREA, 'Updated Main Task')
      .pause(1000)
      // Check that task is updated
      .assert.elementPresent(FIRST_TASK)
      .assert.elementPresent(SECOND_TASK)
      .assert.elementPresent(THIRD_TASK)
      .assert.elementPresent(FOURTH_TASK)
      .assert.valueContains(FOURTH_TASK_TEXTAREA, 'Updated Main Task')
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
      .addTask('New Task After Reload')
      .waitForElementVisible(TASK_SEL)
      // Try to edit the new task
      .click(TASK_TEXTAREA)
      .pause(200)
      .clearValue(TASK_TEXTAREA)
      .setValue(TASK_TEXTAREA, 'Edited Task After Reload')
      .sendKeys(TASK_TEXTAREA, browser.Keys.ESCAPE)
      .pause(500)
      // Verify the edit was saved
      .assert.valueContains(TASK_TEXTAREA, 'Edited Task After Reload')
      // Final error check
      .perform(() => (browser as NBrowser).noError()),
};
