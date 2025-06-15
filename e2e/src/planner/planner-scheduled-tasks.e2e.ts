import { NBrowser } from '../../n-browser-interface';
import { BASE } from '../../e2e.const';

const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;
const TASK = 'task';
const SCHEDULE_BTN = '.schedule-btn';
const TIME_PICKER = 'input[type="time"]';
const CONFIRM_BTN = 'mat-dialog-actions button:last-of-type';

module.exports = {
  '@tags': ['planner', 'planner-scheduled'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should add scheduled task': (browser: NBrowser) =>
    browser
      // Add task
      .addTask('Meeting at 2pm')
      .waitForElementVisible(TASK)
      // Open schedule dialog
      .moveToElement(TASK, 10, 10)
      .waitForElementVisible(`${TASK} ${SCHEDULE_BTN}`)
      .click(`${TASK} ${SCHEDULE_BTN}`)
      // Set time
      .waitForElementVisible(TIME_PICKER)
      .clearValue(TIME_PICKER)
      .setValue(TIME_PICKER, '14:00')
      .click(CONFIRM_BTN)
      .pause(500),

  'should navigate to planner with scheduled tasks': (browser: NBrowser) =>
    browser
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Verify we're on planner or tasks page
      .assert.urlMatches(/\/(planner|tasks)/),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
