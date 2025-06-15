import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const TASK_DONE_BTN = '.task-done-btn';
const FINISH_DAY_BTN = '.e2e-finish-day';
const SAVE_AND_GO_HOME_BTN = 'button.tour-saveAndGoHomeBtn';
const SIDE_NAV_TODAY = 'side-nav section.main side-nav-item:first-of-type button';
const SIDE_NAV_QUICK_HISTORY = 'side-nav section.app button:nth-of-type(1)';
const TABLE_CAPTION = 'mat-table .caption';
const TABLE_ROWS = 'mat-table mat-row';

module.exports = {
  '@tags': ['task', 'finish-day', 'quick-history'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task': (browser: NBrowser) =>
    browser
      .addTask('Task for Quick History')
      .waitForElementVisible(TASK_SEL, 5000)
      .assert.valueContains(TASK_TEXTAREA, 'Task for Quick History'),

  'should mark task as done': (browser: NBrowser) =>
    browser
      .moveToElement(TASK_SEL, 12, 12)
      .pause(200)
      .waitForElementVisible(TASK_DONE_BTN, 5000)
      .click(TASK_DONE_BTN)
      .pause(500)
      .assert.hasClass(TASK_SEL, 'isDone'),

  'should click Finish Day button': (browser: NBrowser) =>
    browser.waitForElementVisible(FINISH_DAY_BTN, 5000).click(FINISH_DAY_BTN).pause(500),

  'should wait for route change and click Save and go home': (browser: NBrowser) =>
    browser
      // Wait for daily summary page to load
      .waitForElementVisible('daily-summary', 10000)
      .pause(500)
      // Click save and go home button
      .waitForElementVisible(SAVE_AND_GO_HOME_BTN, 5000)
      .click(SAVE_AND_GO_HOME_BTN)
      .pause(1000),

  'should verify task is not in Today list anymore': (browser: NBrowser) =>
    browser
      // Navigate to Today view
      .waitForElementVisible(SIDE_NAV_TODAY, 5000)
      .click(SIDE_NAV_TODAY)
      .pause(500)
      .waitForElementVisible('task-list', 5000)
      // Verify no tasks are present
      .assert.not.elementPresent(TASK_SEL),

  'should navigate to quick history via left-hand menu': (browser: NBrowser) =>
    browser
      .waitForElementVisible(SIDE_NAV_QUICK_HISTORY, 5000)
      .click(SIDE_NAV_QUICK_HISTORY)
      .pause(500)
      .waitForElementVisible('quick-history', 5000),

  'should click on table caption': (browser: NBrowser) =>
    browser.waitForElementVisible(TABLE_CAPTION, 5000).click(TABLE_CAPTION).pause(500),

  'should confirm task is in the table': (browser: NBrowser) =>
    browser
      .waitForElementVisible(TABLE_ROWS, 5000)
      .assert.elementPresent(TABLE_ROWS)
      // Verify the task title is present in the table
      .assert.textContains('mat-table', 'Task for Quick History'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
