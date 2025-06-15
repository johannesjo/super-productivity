import { NBrowser } from '../../n-browser-interface';
import { BASE } from '../../e2e.const';

const PLANNER_URL = `${BASE}/#/tag/TODAY/planner`;

module.exports = {
  '@tags': ['planner', 'planner-multiple-days'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should navigate to planner view': (browser: NBrowser) =>
    browser
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper')
      .assert.urlMatches(/\/(planner|tasks)/),

  'should add tasks for planning': (browser: NBrowser) =>
    browser
      // First add some tasks
      .url(`${BASE}/#/tag/TODAY`)
      .waitForElementVisible('task-list')
      .addTask('Task for today')
      .addTask('Task for tomorrow')
      // Go to planner
      .url(PLANNER_URL)
      .pause(1000)
      .waitForElementVisible('.route-wrapper'),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
