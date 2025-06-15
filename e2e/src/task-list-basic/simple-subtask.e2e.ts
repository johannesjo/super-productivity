import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['task', 'simple-subtask'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create subtask with keyboard shortcut': (browser: NBrowser) =>
    browser
      .addTask('Parent Task')
      .waitForElementVisible('task', 5000)
      // After adding task, the textarea should be focused
      // Send 'a' directly to create subtask
      .perform(() => (browser as NBrowser).sendKeysToActiveEl('a'))
      .pause(1000)
      // Now type the subtask content directly
      .perform(() =>
        (browser as NBrowser).sendKeysToActiveEl(['Sub Task 1', browser.Keys.ENTER]),
      )
      .pause(1000)
      // Check if subtasks container exists
      .execute(() => {
        const subTasksContainer = document.querySelector('task .sub-tasks');
        console.log('Subtasks container exists:', !!subTasksContainer);

        // Count all tasks
        const allTasks = document.querySelectorAll('task');
        console.log('Total tasks:', allTasks.length);

        // Check task structure
        const parentTask = document.querySelector('task');
        if (parentTask) {
          const hasSubTasks = parentTask.querySelector('.sub-tasks');
          console.log('Parent task has subtasks container:', !!hasSubTasks);

          if (hasSubTasks) {
            const subtasks = hasSubTasks.querySelectorAll('task');
            console.log('Number of subtasks:', subtasks.length);
          }
        }
      })
      // Verify subtask was created
      .waitForElementVisible('task .sub-tasks', 10000)
      .waitForElementVisible('task .sub-tasks task', 5000)
      .assert.valueContains('task .sub-tasks task textarea', 'Sub Task 1'),
};
