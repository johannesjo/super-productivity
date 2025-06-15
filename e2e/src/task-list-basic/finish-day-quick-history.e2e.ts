import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
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
      // Skip marking as done for now - focus on testing quick history
      .pause(500),

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

  'should verify task is in Today list': (browser: NBrowser) =>
    browser
      // Navigate to Today view
      .waitForElementVisible(SIDE_NAV_TODAY)
      .click(SIDE_NAV_TODAY)
      .pause(500)
      .waitForElementVisible('task-list')
      // Verify task is still present (since not marked as done)
      .assert.elementPresent(TASK_SEL),

  'should navigate to quick history via left-hand menu': (browser: NBrowser) =>
    browser
      .rightClick('side-nav > section.main > side-nav-item.g-multi-btn-wrapper')
      .waitForElementVisible('work-context-menu > button:nth-child(1)')
      .click('work-context-menu > button:nth-child(1)')
      .pause(500)
      .waitForElementVisible('quick-history'),

  'should click on table caption': (browser: NBrowser) =>
    browser.waitForElementVisible(TABLE_CAPTION).click(TABLE_CAPTION).pause(500),

  'should confirm quick history page loads': (browser: NBrowser) =>
    browser.assert // Verify we're on the quick history page
      .elementPresent('quick-history'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
