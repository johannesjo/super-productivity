import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const TARGET_URL = `${BASE}/`;
const CANCEL_BTN = 'mat-dialog-actions button:nth-of-type(1)';

module.exports = {
  '@tags': ['basic'],

  'should open all basic routes from menu without error': (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog(TARGET_URL)
      .url(`${BASE}/#/tag/TODAY/schedule`)

      .click('section.main > side-nav-item > button')
      .click('section.main > button:nth-of-type(1)')
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)

      .click('section.main > button:nth-of-type(2)')

      .click('section.projects button')
      .click('section.tags button')

      .click('section.app > button:nth-of-type(1)')
      // .click('section.app > button:nth-of-type(2)')
      // .waitForElementVisible('.cdk-overlay-backdrop')
      // .click('.cdk-overlay-backdrop')
      .click('button.tour-settingsMenuBtn')

      .url(`${BASE}/#/tag/TODAY/quick-history`)
      .pause(500)
      .url(`${BASE}/#/tag/TODAY/worklog`)
      .pause(500)
      .url(`${BASE}/#/tag/TODAY/metrics`)
      .pause(500)
      .url(`${BASE}/#/tag/TODAY/planner`)
      .pause(500)
      .url(`${BASE}/#/tag/TODAY/daily-summary`)
      .pause(500)
      .url(`${BASE}/#/tag/TODAY/settings`)
      .pause(500)

      .noError()

      .end(),
};
