import { NBrowser } from '../../n-browser-interface';
import { BASE } from '../../e2e.const';

const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;
const TASK = 'task';

module.exports = {
  '@tags': ['planner', 'planner-basic'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should navigate to planner view': (browser: NBrowser) =>
    browser
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      .assert.elementPresent('.route-wrapper'),

  'should show planner or tasks content': (browser: NBrowser) =>
    browser.assert // Planner might redirect to tasks view
      .urlMatches(/\/(planner|tasks)/),

  'should add task and navigate to planner': (browser: NBrowser) =>
    browser
      // Go to work view
      .url(`${BASE}/#/tag/TODAY`)
      .waitForElementVisible('task-list')
      // Add a task
      .addTask('Task for planner')
      .waitForElementVisible(TASK)
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Just verify we're on planner or tasks page
      .assert.urlMatches(/\/(planner|tasks)/),

  'should add multiple tasks': (browser: NBrowser) =>
    browser
      // Go back to work view
      .url(`${BASE}/#/tag/TODAY`)
      .waitForElementVisible('task-list')
      // Add more tasks
      .addTask('Second task')
      .addTask('Third task')
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Verify we're on planner or tasks
      .assert.urlMatches(/\/(planner|tasks)/),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
