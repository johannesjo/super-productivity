import { cssSelectors } from '../../e2e.const';
import { NBrowser } from '../../n-browser-interface';

const { TASK_LIST } = cssSelectors;
/* eslint-disable @typescript-eslint/naming-convention */

const TASK = 'task';
const TASK_2 = `${TASK}:nth-of-type(1)`;
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';
const TASK_SCHEDULE_BTN_2 = TASK_2 + ' ' + TASK_SCHEDULE_BTN;

const SCHEDULE_ROUTE_BTN = 'button[routerlink="scheduled-list"]';
const SCHEDULE_PAGE_CMP = 'scheduled-list-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks planner-task`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2 = `${SCHEDULE_PAGE_TASKS}:nth-of-type(2)`;
const SCHEDULE_PAGE_TASK_1_TITLE_EL = `${SCHEDULE_PAGE_TASK_1} .title`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2_TITLE_EL = `${SCHEDULE_PAGE_TASK_2} .title`;

module.exports = {
  '@tags': ['task', 'reminder'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should add a scheduled tasks': (browser: NBrowser) =>
    browser
      .waitForElementPresent(TASK_LIST)
      .addTaskWithReminder({ title: '0 test task koko', scheduleTime: Date.now() })
      .waitForElementVisible(TASK)
      .waitForElementVisible(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN)

      // Navigate to scheduled page and check if entry is there
      .click(SCHEDULE_ROUTE_BTN)
      .waitForElementVisible(SCHEDULE_PAGE_CMP)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1_TITLE_EL)
      .assert.textContains(SCHEDULE_PAGE_TASK_1_TITLE_EL, '0 test task koko'),

  'should add multiple scheduled tasks': (browser: NBrowser) =>
    browser
      .click('.current-work-context-title')
      .waitForElementPresent(TASK_LIST)
      .pause(1000)
      .addTaskWithReminder({
        title: '2 hihihi',
        taskSel: TASK_2,
        scheduleTime: Date.now(),
      })
      .waitForElementVisible(TASK)
      .waitForElementVisible(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN_2)

      // Navigate to scheduled page and check if entry is there
      .click(SCHEDULE_ROUTE_BTN)
      .waitForElementVisible(SCHEDULE_PAGE_CMP)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1_TITLE_EL)
      .assert.textContains(SCHEDULE_PAGE_TASK_1_TITLE_EL, '0 test task koko')
      .assert.textContains(SCHEDULE_PAGE_TASK_2_TITLE_EL, '2 hihihi'),
};
