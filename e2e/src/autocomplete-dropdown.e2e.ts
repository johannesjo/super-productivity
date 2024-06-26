import { NBrowser } from '../n-browser-interface';
import { cssSelectors, WORK_VIEW_URL } from '../e2e.const';

const AUTOCOMPLETE = 'mention-list';
const { READY_TO_WORK_BTN } = cssSelectors;

module.exports = {
  '@tags': ['task', 'short-syntax', 'autocomplete'],

  'should add an autocomplete dropdown when using short syntax': (browser: NBrowser) => {
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .draftTask('Test the presence of autocomplete component #')
      .waitForElementPresent(AUTOCOMPLETE)
      .assert.elementPresent(AUTOCOMPLETE)
      .end();
  },
};
