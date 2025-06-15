import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const TASK_DONE_BTN = '.task-done-btn';
const FINISH_DAY_BTN = '.e2e-finish-day';
const SAVE_AND_GO_HOME_BTN = 'button[mat-flat-button][color="primary"]:last-of-type';
const SIDE_NAV_TODAY = 'side-nav section.main side-nav-item:first-of-type button';
const TABLE_CAPTION = 'quick-history  h3';

module.exports = {
  '@tags': ['task', 'NEW', 'finish-day', 'quick-history'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task': (browser: NBrowser) =>
    browser
      .addTask('Task for Quick History')
      .waitForElementVisible(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Task for Quick History'),

  'should mark task as done': (browser: NBrowser) =>
    browser
      .moveToElement(TASK_SEL, 12, 12)
      .pause(200)
      .waitForElementVisible(TASK_DONE_BTN)
      .click(TASK_DONE_BTN)
      .pause(500)
      .assert.hasClass(TASK_SEL, 'isDone'),

  'should click Finish Day button': (browser: NBrowser) =>
    browser.waitForElementVisible(FINISH_DAY_BTN).click(FINISH_DAY_BTN).pause(500),

  'should wait for route change and click Save and go home': (browser: NBrowser) =>
    browser
      // Wait for daily summary page to load
      .waitForElementVisible('daily-summary')
      .pause(500)
      // Click save and go home button
      .waitForElementVisible(SAVE_AND_GO_HOME_BTN)
      .click(SAVE_AND_GO_HOME_BTN)
      .pause(1000),

  'should verify task is not in Today list anymore': (browser: NBrowser) =>
    browser
      // Navigate to Today view
      .waitForElementVisible(SIDE_NAV_TODAY)
      .click(SIDE_NAV_TODAY)
      .pause(500)
      .waitForElementVisible('task-list')
      // Verify no tasks are present
      .assert.not.elementPresent(TASK_SEL),

  'should navigate to quick history via left-hand menu': (browser: NBrowser) =>
    browser
      .rightClick('side-nav > section.main > side-nav-item.g-multi-btn-wrapper')
      .waitForElementVisible('work-context-menu > button:nth-child(1)')
      .click('work-context-menu > button:nth-child(1)')
      .pause(500)
      .waitForElementVisible('quick-history'),

  'should click on table caption': (browser: NBrowser) =>
    browser.waitForElementVisible(TABLE_CAPTION).click(TABLE_CAPTION).pause(500),

  'should confirm task is in the table': (browser: NBrowser) =>
    browser
      .waitForElementVisible('table > tr:nth-child(1) > td.title > span')
      // Verify the task title is present in the table
      .assert.textContains(
        'table > tr:nth-child(1) > td.title > span',
        'Task for Quick History',
      ),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
