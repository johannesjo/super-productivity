import { NBrowser } from '../../n-browser-interface';
import { BASE } from '../../e2e.const';

const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;

module.exports = {
  '@tags': ['planner', 'planner-drag-drop'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should setup tasks for drag and drop': (browser: NBrowser) =>
    browser
      // Add tasks
      .addTask('Task A')
      .addTask('Task B')
      .addTask('Task C')
      // Navigate to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper'),

  'should show tasks in planner view': (browser: NBrowser) =>
    browser.assert // Verify we're on the planner or tasks page
      .urlMatches(/\/(planner|tasks)/)
      // Tasks should be present
      .assert.elementPresent('task'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
