// import { NBrowser } from '../../n-browser-interface';
// import { BASE } from '../../e2e.const';
//
// const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;
// const TASK_WITH_TIME = 'task';
// const TIME_ESTIMATE_BTN = '.time-estimate-btn';
// const TIME_INPUT = 'input[type="text"][placeholder*="2h 30m"]';
//
// module.exports = {
//   '@tags': ['planner', 'planner-time-estimates'],
//
//   before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
//
//   after: (browser: NBrowser) => browser.end(),
//
//   'should add task with time estimate': (browser: NBrowser) =>
//     browser
//       // Add task
//       .addTask('Task with time estimate')
//       .waitForElementVisible(TASK_WITH_TIME)
//       // Click time estimate button
//       .moveToElement(TASK_WITH_TIME, 10, 10)
//       .waitForElementVisible(`${TASK_WITH_TIME} ${TIME_ESTIMATE_BTN}`)
//       .click(`${TASK_WITH_TIME} ${TIME_ESTIMATE_BTN}`)
//       // Enter time estimate
//       .waitForElementVisible(TIME_INPUT)
//       .clearValue(TIME_INPUT)
//       .setValue(TIME_INPUT, '2h')
//       .sendKeys(TIME_INPUT, browser.Keys.ENTER)
//       .pause(500),
//
//   'should navigate to planner with time estimates': (browser: NBrowser) =>
//     browser
//       // Navigate to planner
//       .url(PLANNER_URL)
//       .pause(1000)
//       .waitForElementVisible('.route-wrapper')
//       // Verify we're on planner or tasks page
//       .assert.urlMatches(/\/(planner|tasks)/),
//
//   'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
// };
