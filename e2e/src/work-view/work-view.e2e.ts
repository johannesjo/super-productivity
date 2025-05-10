import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { TASK_LIST } = cssSelectors;

/* eslint-disable @typescript-eslint/naming-convention */

const TASK = 'task';
const TASK_TEXTAREA = 'task textarea';
// const ADD_TASK_GLOBAL = 'add-task-bar.global input';
// const ADD_TASK_BTN = '.action-nav > button:first-child';

module.exports = {
  '@tags': ['work-view', 'task', 'task-standard', 'AAA'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should add task via key combo': (browser: NBrowser) =>
    browser
      .waitForElementVisible(TASK_LIST)
      .addTask('0 test task koko')
      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.valueContains(TASK_TEXTAREA, '0 test task koko'),

  // 'should add multiple tasks from header button': (browser: NBrowser) =>
  //   browser
  //     .click(ADD_TASK_BTN)
  //     .waitForElementVisible(ADD_TASK_GLOBAL)
  //
  //     .sendKeysToActiveEl([
  //       '4 test task hohoho',
  //       browser.Keys.ENTER,
  //       '5 some other task xoxo',
  //       browser.Keys.ENTER,
  //     ])
  //
  //     .waitForElementVisible(TASK)
  //     .assert.visible(TASK)
  //     // NOTE: global adds to top rather than bottom
  //     .assert.valueContains(TASK + ':nth-child(1) textarea', '5 some other task xoxo')
  //     .assert.valueContains(TASK + ':nth-child(2) textarea', '4 test task hohoho'),

  // 'should focus previous subtask when marking last subtask done': (browser: NBrowser) =>
  //   browser
  //     .addTask('task1')
  //     .addTask('task2')
  //     .sendKeysToActiveEl('a')
  //     .sendKeysToActiveEl(['task3', browser.Keys.ENTER])
  //     .setValue('task-list task-list task:nth-child(1)', 'a')
  //     .sendKeysToActiveEl(['task4', browser.Keys.ENTER])
  //     .waitForElementVisible('.sub-tasks task-list task:nth-child(2)')
  //     // .moveToElement('.sub-tasks .task-list-inner task:nth-child(2)', 30, 30)
  //     .moveToElement('.sub-tasks task:nth-child(1)', 30, 30)
  //     .click('.task-done-btn')
  //     .execute(
  //       () => document.activeElement,
  //       (result) => browser.assert.textContains(result.value as any, 'task3'),
  //     ),

  // 'should still show created task after reload': (browser: NBrowser) =>
  //   browser
  //     .addTask('0 test task lolo')
  //     .waitForElementVisible(TASK)
  //     .execute('window.location.reload()')
  //
  //     .waitForElementVisible(TASK)
  //     .assert.visible(TASK)
  //     .assert.valueContains(TASK_TEXTAREA, '0 test task lolo'),
  // .assert.textContains(':focus', 'task3')

  // 'should add a task from initial bar': (browser: NBrowser) =>
  //   browser
  //     .click(ADD_MORE_BTN)
  //     .waitForElementVisible(ADD_TASK_INITIAL)
  //
  //     .setValue(ADD_TASK_INITIAL, '1 test task hihi')
  //     .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
  //
  //     .waitForElementVisible(TASK)
  //     .assert.visible(TASK)
  //     .assert.valueContains(TASK_TEXTAREA, '1 test task hihi'),
  // 'should add 2 tasks from initial bar': (browser: NBrowser) =>
  //   browser
  //     .click(ADD_MORE_BTN)
  //     .waitForElementVisible(ADD_TASK_INITIAL)
  //
  //     .setValue(ADD_TASK_INITIAL, '2 test task hihi')
  //     .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
  //     .setValue(ADD_TASK_INITIAL, '3 some other task')
  //     .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
  //
  //     .waitForElementVisible(TASK)
  //     .assert.visible(TASK)
  //     .assert.valueContains(TASK + ':nth-child(1) textarea', '3 some other task')
  //     .assert.valueContains(TASK + ':nth-child(2) textarea', '2 test task hihi'),

  // 'should add 3 tasks from initial bar and remove 2 of them via the default keyboard shortcut':
  //   (browser: NBrowser) =>
  //     browser
  //       .click(ADD_MORE_BTN)
  //       .waitForElementVisible(ADD_TASK_INITIAL)
  //
  //       .addTask('3 hihi some other task')
  //       .addTask('2 some other task')
  //       .addTask('1 test task hihi')
  //
  //       .waitForElementVisible(TASK)
  //
  //       // focus
  //       .sendKeysToActiveEl(browser.Keys.TAB)
  //       .sendKeysToActiveEl(browser.Keys.TAB)
  //
  //       .sendKeysToActiveEl(browser.Keys.BACK_SPACE)
  //
  //       .sendKeysToActiveEl(browser.Keys.BACK_SPACE)
  //       .waitForElementNotPresent(TASK + ':nth-child(2)')
  //
  //       .assert.valueContains(TASK_TEXTAREA, '1 test task hihi'),
};

//
// import { NBrowser } from '../n-browser-interface';
// import { BASE, cssSelectors } from '../e2e.const';
// const { FINISH_DAY_BTN } = cssSelectors;
//
// /* eslint-disable @typescript-eslint/naming-convention */
//
// const ADD_TASK_INITIAL = 'add-task-bar:not(.global) input';
// const ADD_TASK_GLOBAL = 'add-task-bar.global input';
// const TASK = 'task';
// const ADD_TASK_BTN = '.action-nav > button:first-child';
// const WORK_VIEW_URL = `${BASE}/`;
// const TASK_TEXTAREA = 'task textarea';
// const ADD_MORE_BTN = '.btn-wrapper button';
//
// module.exports = {
//   '@tags': ['work-view', 'task', 'task-standard'],
//   'should add task via key combo': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .waitForElementVisible(FINISH_DAY_BTN)
//       .addTask('0 test task koko')
//       .waitForElementVisible(TASK)
//       .assert.visible(TASK)
//       .assert.valueContains(TASK_TEXTAREA, '0 test task koko')
//       .end(),
//
//   'should add a task from initial bar': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .click(ADD_MORE_BTN)
//       .waitForElementVisible(ADD_TASK_INITIAL)
//
//       .setValue(ADD_TASK_INITIAL, '1 test task hihi')
//       .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
//
//       .waitForElementVisible(TASK)
//       .assert.visible(TASK)
//       .assert.valueContains(TASK_TEXTAREA, '1 test task hihi')
//       .end(),
//
//   'should add 2 tasks from initial bar': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .click(ADD_MORE_BTN)
//       .waitForElementVisible(ADD_TASK_INITIAL)
//
//       .setValue(ADD_TASK_INITIAL, '2 test task hihi')
//       .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
//       .setValue(ADD_TASK_INITIAL, '3 some other task')
//       .setValue(ADD_TASK_INITIAL, browser.Keys.ENTER)
//
//       .waitForElementVisible(TASK)
//       .assert.visible(TASK)
//       .assert.valueContains(TASK + ':nth-child(1) textarea', '3 some other task')
//       .assert.valueContains(TASK + ':nth-child(2) textarea', '2 test task hihi')
//       .end(),
//
//   'should add multiple tasks from header button': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .click(ADD_TASK_BTN)
//       .waitForElementVisible(ADD_TASK_GLOBAL)
//
//       .sendKeysToActiveEl([
//         '4 test task hohoho',
//         browser.Keys.ENTER,
//         '5 some other task xoxo',
//         browser.Keys.ENTER,
//       ])
//
//       .waitForElementVisible(TASK)
//       .assert.visible(TASK)
//       // NOTE: global adds to top rather than bottom
//       .assert.valueContains(TASK + ':nth-child(1) textarea', '5 some other task xoxo')
//       .assert.valueContains(TASK + ':nth-child(2) textarea', '4 test task hohoho')
//       .end(),
//
//   'should still show created task after reload': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .waitForElementVisible(FINISH_DAY_BTN)
//       .addTask('0 test task lolo')
//       .waitForElementVisible(TASK)
//       .execute('window.location.reload()')
//
//       .waitForElementVisible(TASK)
//       .assert.visible(TASK)
//       .assert.valueContains(TASK_TEXTAREA, '0 test task lolo')
//       .end(),
//
//   'should add 3 tasks from initial bar and remove 2 of them via the default keyboard shortcut':
//     (browser: NBrowser) =>
//       browser
//         .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//         .click(ADD_MORE_BTN)
//         .waitForElementVisible(ADD_TASK_INITIAL)
//
//         .addTask('3 hihi some other task')
//         .addTask('2 some other task')
//         .addTask('1 test task hihi')
//
//         .waitForElementVisible(TASK)
//
//         // focus
//         .sendKeysToActiveEl(browser.Keys.TAB)
//         .sendKeysToActiveEl(browser.Keys.TAB)
//
//         .sendKeysToActiveEl(browser.Keys.BACK_SPACE)
//
//         .sendKeysToActiveEl(browser.Keys.BACK_SPACE)
//         .waitForElementNotPresent(TASK + ':nth-child(2)')
//
//         .assert.valueContains(TASK_TEXTAREA, '1 test task hihi')
//         .end(),
//
//   'should focus previous subtask when marking last subtask done': (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
//       .addTask('task1')
//       .addTask('task2')
//       .sendKeysToActiveEl('a')
//       .sendKeysToActiveEl(['task3', browser.Keys.ENTER])
//       .setValue('task-list task-list task:nth-child(1)', 'a')
//       .sendKeysToActiveEl(['task4', browser.Keys.ENTER])
//       .waitForElementVisible('.sub-tasks task-list task:nth-child(2)')
//       // .moveToElement('.sub-tasks .task-list-inner task:nth-child(2)', 30, 30)
//       .moveToElement('.sub-tasks task:nth-child(1)', 30, 30)
//       .click('.task-done-btn')
//       .execute(
//         () => document.activeElement,
//         (result) => browser.assert.textContains(result.value as any, 'task3'),
//       )
//       // .assert.textContains(':focus', 'task3')
//       .end(),
// };
