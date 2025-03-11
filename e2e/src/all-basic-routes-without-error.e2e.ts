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

      .click('side-nav section.main > side-nav-item > button')
      .click('side-nav section.main > button:nth-of-type(1)')
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)

      .click('side-nav section.main > button:nth-of-type(2)')

      .click('side-nav section.projects button')
      .click('side-nav section.tags button')

      .click('side-nav section.app > button:nth-of-type(1)')
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

      // to open notes dialog
      .sendKeys('body', 'n')

      .noError()

      .end(),
};
