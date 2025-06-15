// import { NBrowser } from '../../n-browser-interface';

module.exports = {
  // COMMENTED OUT - DEBUG TEST
  /*
  '@tags': ['task', 'debug-subtask'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should debug subtask creation': (browser: NBrowser) =>
    browser
      .addTask('Test Parent Task')
      .waitForElementVisible('task', 5000)
      .pause(1000)
      // Try different methods to create subtask
      .execute(() => {
        console.log('=== DEBUG: Starting subtask creation test ===');
        const tasks = document.querySelectorAll('task');
        console.log('Number of tasks:', tasks.length);

        // Find the task element
        const taskEl = tasks[0];
        if (taskEl) {
          console.log('Task found, trying to focus textarea');
          const textarea = taskEl.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            console.log('Textarea focused');

            // Try dispatching keyboard event directly
            const event = new KeyboardEvent('keydown', {
              key: 'a',
              code: 'KeyA',
              bubbles: true,
              cancelable: true,
            });
            taskEl.dispatchEvent(event);
            console.log('Dispatched keydown event for "a"');
          }
        }
      })
      .pause(2000)
      // Check what happened
      .execute(() => {
        // Check if subtasks container exists
        const subTasksContainer = document.querySelector('task .sub-tasks');
        console.log('Subtasks container exists:', !!subTasksContainer);

        // Check all tasks
        const allTasks = document.querySelectorAll('task');
        console.log('Total tasks after pressing "a":', allTasks.length);

        // Check for any add-task-bar
        const addTaskBar = document.querySelector('add-task-bar');
        console.log('Add task bar visible:', !!addTaskBar);

        // Check task structure
        const firstTask = allTasks[0];
        if (firstTask) {
          console.log('First task HTML structure:');
          console.log(firstTask.innerHTML.substring(0, 500));
        }
      })
      // Try using context menu instead
      .rightClick('task textarea')
      .pause(1000)
      .execute(() => {
        const contextMenu = document.querySelector('mat-menu-panel');
        console.log('Context menu visible:', !!contextMenu);
        if (contextMenu) {
          const items = contextMenu.querySelectorAll('button');
          items.forEach((item, i) => {
            console.log(`Menu item ${i}:`, item.textContent?.trim());
          });
        }
      })
      // Look for "Add Subtask" option
      .waitForElementVisible('mat-menu-panel', 5000)
      .execute(() => {
        const menuItems = document.querySelectorAll('mat-menu-panel button');
        for (let i = 0; i < menuItems.length; i++) {
          const item = menuItems[i];
          if (
            item.textContent?.includes('Add Subtask') ||
            item.textContent?.includes('Add Sub Task')
          ) {
            console.log('Found Add Subtask menu item, clicking it');
            (item as HTMLElement).click();
            return true;
          }
        }
        console.log('Add Subtask menu item not found');
        return false;
      })
      .pause(2000)
      // Final check
      .execute(() => {
        const subTasksContainer = document.querySelector('task .sub-tasks');
        console.log('=== FINAL CHECK ===');
        console.log('Subtasks container exists:', !!subTasksContainer);
        console.log('All tasks:', document.querySelectorAll('task').length);

        // Check if any input is focused
        const activeEl = document.activeElement;
        console.log('Active element:', activeEl?.tagName, activeEl?.className);
      }),
  */
};
