import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
// const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const SUB_TASK_INPUT = 'add-task-bar input';
const FIRST_SUB_TASK = '.sub-tasks task:nth-child(1)';
const FIRST_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(1) textarea';

module.exports = {
  '@tags': ['task', 'sub-task', 'debug'],

  before: (browser: NBrowser) => {
    console.log('DEBUG: before hook called');
    return browser.loadAppAndClickAwayWelcomeDialog();
  },

  after: (browser: NBrowser) => {
    console.log('DEBUG: after hook called');
    return browser.end();
  },

  'test 1 - should add a parent task': (browser: NBrowser) => {
    console.log('DEBUG: test 1 starting');
    return browser
      .addTask('Parent Task')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Parent Task')
      .execute(
        () => {
          console.log('DEBUG: test 1 - browser context check');
          return window.location.href;
        },
        [],
        (result) => {
          console.log('DEBUG: test 1 URL:', result.value);
        },
      );
  },

  'test 2 - should add a sub task': (browser: NBrowser) => {
    console.log('DEBUG: test 2 starting');
    return browser
      .execute(
        () => {
          console.log('DEBUG: test 2 - browser context check');
          return window.location.href;
        },
        [],
        (result) => {
          console.log('DEBUG: test 2 URL:', result.value);
        },
      )
      .waitForElementVisible(TASK_SEL)
      .click(TASK_TEXTAREA) // Click on task first
      .pause(200)
      .setValue('body', 'a') // Press 'a' to add sub-task
      .waitForElementVisible(SUB_TASK_INPUT)
      .setValue(SUB_TASK_INPUT, 'Sub Task 1')
      .setValue(SUB_TASK_INPUT, browser.Keys.ENTER)
      .waitForElementVisible(FIRST_SUB_TASK)
      .assert.valueContains(FIRST_SUB_TASK_TEXTAREA, 'Sub Task 1');
  },
};
