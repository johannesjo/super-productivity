import { BASE } from '../../e2e.const';
import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const URL = `${BASE}/#/tag/TODAY/daily-summary`;
const SUMMARY_TABLE_TASK_EL = '.task-title .value-wrapper';

module.exports = {
  '@tags': ['daily-summary'],

  'Daily summary message': (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog(URL)
      .waitForElementVisible('.done-headline')
      .assert.textContains('.done-headline', 'Take a moment to celebrate'),

  'show any added task in table': (browser: NBrowser) =>
    browser
      .addTask('test task hohoho 1h/1h')
      .waitForElementVisible(SUMMARY_TABLE_TASK_EL)
      .assert.textContains(SUMMARY_TABLE_TASK_EL, 'test task hohoho')
      .end(),
};
