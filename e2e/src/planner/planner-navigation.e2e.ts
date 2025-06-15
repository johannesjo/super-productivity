import { NBrowser } from '../../n-browser-interface';
import { BASE } from '../../e2e.const';

const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;
const WORK_VIEW_URL = `${BASE}/#/tag/TODAY`;

module.exports = {
  '@tags': ['planner', 'planner-navigation'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should navigate between work view and planner': (browser: NBrowser) =>
    browser
      // Start at work view
      .url(WORK_VIEW_URL)
      .waitForElementVisible('task-list')
      .assert.urlContains('/tag/TODAY')
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      .assert.urlMatches(/\/(planner|tasks)/)
      // Go back to work view
      .url(WORK_VIEW_URL)
      .waitForElementVisible('task-list')
      .assert.urlContains('/tag/TODAY'),

  'should maintain tasks when navigating': (browser: NBrowser) =>
    browser
      // Add tasks in work view
      .addTask('Navigation test task')
      .waitForElementVisible('task')
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Go back to work view
      .url(WORK_VIEW_URL)
      .waitForElementVisible('task-list')
      // Task should still be there
      .assert.elementPresent('task')
      .assert.textContains('task', 'Navigation test task'),

  'should persist planner state after refresh': (browser: NBrowser) =>
    browser
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Refresh page
      .refresh()
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      // Should still be on planner or tasks
      .assert.urlMatches(/\/(planner|tasks)/),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
