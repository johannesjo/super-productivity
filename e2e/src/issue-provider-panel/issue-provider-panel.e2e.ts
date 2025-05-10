import { NBrowser } from '../../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const PANEL_BTN = '.e2e-toggle-issue-provider-panel';
const ITEMS1 = '.items:nth-of-type(1)';
const ITEMS2 = '.items:nth-of-type(2)';

const CANCEL_BTN = 'mat-dialog-actions button:nth-of-type(1)';

module.exports = {
  '@tags': ['issue', 'issue-provider-panel'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should open all dialogs without error': (browser: NBrowser) =>
    browser
      .waitForElementVisible(PANEL_BTN)
      .click(PANEL_BTN)
      .waitForElementVisible('issue-provider-setup-overview')

      .click(`${ITEMS1} > button:nth-of-type(1)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS1} > button:nth-of-type(2)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS1} > button:nth-of-type(3)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)

      .click(`${ITEMS2} > button:nth-of-type(1)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(2)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(3)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(4)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(5)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(6)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)
      .click(`${ITEMS2} > button:nth-of-type(7)`)
      .waitForElementVisible(CANCEL_BTN)
      .click(CANCEL_BTN)

      .noError(),
};
