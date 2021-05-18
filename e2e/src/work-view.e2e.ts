import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const ADD_TASK_INITIAL = 'add-task-bar:not(.global) input';
const ADD_TASK_GLOBAL = 'add-task-bar.global input';
const TASK = 'task';
const ADD_TASK_BTN = '.action-nav > button:first-child';
const WORK_VIEW_URL = `${BASE}/`;
const READY_TO_WORK_BTN = '.ready-to-work-btn';

module.exports = {
  '@tags': ['work-view', 'task'],

  'should add task via key combo': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .addTask('0 test task koko')
      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.containsText(TASK, '0 test task koko')
      .end(),

  'should add a task from initial bar': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .waitForElementVisible(ADD_TASK_INITIAL)

      .setValue(ADD_TASK_INITIAL, '1 test task hihi')
      .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)

      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.containsText(TASK, '1 test task hihi')
      .end(),

  'should add 2 tasks from initial bar': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .waitForElementVisible(ADD_TASK_INITIAL)

      .setValue(ADD_TASK_INITIAL, '2 test task hihi')
      .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
      .setValue(ADD_TASK_INITIAL, '3 some other task')
      .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)

      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.containsText(TASK + ':nth-child(1)', '2 test task hihi')
      .assert.containsText(TASK + ':nth-child(2)', '3 some other task')
      .end(),

  'should add multiple tasks from header button': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .waitForElementVisible(ADD_TASK_BTN)
      .click(ADD_TASK_BTN)
      .waitForElementVisible(ADD_TASK_GLOBAL)

      .setValue(ADD_TASK_GLOBAL, '4 test task hohoho')
      .setValue(ADD_TASK_GLOBAL, browser.Keys.ENTER)
      .setValue(ADD_TASK_GLOBAL, '5 some other task xoxo')
      .setValue(ADD_TASK_GLOBAL, browser.Keys.ENTER)

      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      // NOTE: global adds to top rather than bottom
      .assert.containsText(TASK + ':nth-child(1)', '5 some other task xoxo')
      .assert.containsText(TASK + ':nth-child(2)', '4 test task hohoho')
      .end(),

  'should still show created task after reload': (browser: NBrowser) =>
    browser
      .url(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .addTask('0 test task lolo')
      .waitForElementVisible(TASK)
      .execute('window.location.reload()')

      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.containsText(TASK, '0 test task lolo')
      .end(),
};
