import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const URL = `${BASE}/#/tag/TODAY/daily-summary`;
const ADD_TASK_BTN_SEL = '.action-nav > button:first-child';
const ADD_TASK_GLOBAL_SEL = 'add-task-bar.global input';

module.exports = {
  '@tags': ['daily-summary'],

  'Daily summary message': (browser: NBrowser) =>
    browser
      .url(URL)
      .waitForElementVisible('.done-headline')
      .assert.containsText('.done-headline', 'Take a moment to celebrate')
      .end(),

  'show any added task in table': (browser: NBrowser) =>
    browser
      .url(URL)
      .waitForElementVisible(ADD_TASK_BTN_SEL)
      .click(ADD_TASK_BTN_SEL)
      .waitForElementVisible(ADD_TASK_GLOBAL_SEL)

      .setValue(ADD_TASK_GLOBAL_SEL, 'test task hohoho')
      .setValue(ADD_TASK_GLOBAL_SEL, browser.Keys.ENTER)
      .end(),
};
