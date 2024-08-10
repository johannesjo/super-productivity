import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const WORK_VIEW_URL = `${BASE}/`;

const TASK = 'task';
const TASK_2 = `${TASK}:nth-of-type(1)`;
const READY_TO_WORK_BTN = '.ready-to-work-btn';
const TASK_SCHEDULE_BTN = '.ico-btn.schedule-btn';
const TASK_SCHEDULE_BTN_2 = TASK_2 + ' ' + TASK_SCHEDULE_BTN;

const SCHEDULE_ROUTE_BTN = 'button[routerlink="scheduled"]';
const SCHEDULE_PAGE_CMP = 'schedule-page';
const SCHEDULE_PAGE_TASKS = `${SCHEDULE_PAGE_CMP} .tasks mat-card`;
const SCHEDULE_PAGE_TASK_1 = `${SCHEDULE_PAGE_TASKS}:first-of-type`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2 = `${SCHEDULE_PAGE_TASKS}:nth-of-type(2)`;
const SCHEDULE_PAGE_TASK_1_TEXT_AREA = `${SCHEDULE_PAGE_TASK_1} textarea`;
// Note: not sure why this is the second child, but it is
const SCHEDULE_PAGE_TASK_2_TEXTAREA = `${SCHEDULE_PAGE_TASK_2} textarea`;

module.exports = {
  '@tags': ['task', 'reminder'],

  'should add a scheduled tasks': (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementPresent(READY_TO_WORK_BTN)
      .addTaskWithReminder({ title: '0 test task koko', scheduleTime: Date.now() })
      .waitForElementVisible(TASK)
      .waitForElementVisible(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN)

      // Navigate to scheduled page and check if entry is there
      .click(SCHEDULE_ROUTE_BTN)
      .waitForElementVisible(SCHEDULE_PAGE_CMP)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1)
      .assert.valueContains(SCHEDULE_PAGE_TASK_1_TEXT_AREA, '0 test task koko')
      .end(),

  'should add multiple scheduled tasks': (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementPresent(READY_TO_WORK_BTN)
      .addTaskWithReminder({ title: '0 test task koko', taskSel: TASK })
      .addTaskWithReminder({ title: '2 hihihi', taskSel: TASK_2 })
      .waitForElementVisible(TASK)
      .waitForElementVisible(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN)
      .assert.elementPresent(TASK_SCHEDULE_BTN_2)

      // Navigate to scheduled page and check if entry is there
      .click(SCHEDULE_ROUTE_BTN)
      .waitForElementVisible(SCHEDULE_PAGE_CMP)
      .waitForElementVisible(SCHEDULE_PAGE_TASK_1)
      .assert.valueContains(SCHEDULE_PAGE_TASK_1_TEXT_AREA, '0 test task koko')
      .assert.valueContains(SCHEDULE_PAGE_TASK_2_TEXTAREA, '2 hihihi')
      .end(),
};
