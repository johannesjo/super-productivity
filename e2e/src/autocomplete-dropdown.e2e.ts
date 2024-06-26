import { NBrowser } from '../n-browser-interface';
import { cssSelectors, WORK_VIEW_URL } from '../e2e.const';

const AUTOCOMPLETE = 'mention-list';
const ACTIVE_AUTOCOMPLETE_ITEM = `${AUTOCOMPLETE} .mention-active`;
const ACTIVE_AUTOCOMPLETE_ITEM_TEXT = `${ACTIVE_AUTOCOMPLETE_ITEM} .mention-item`;
const { EXPAND_TAG_BTN, READY_TO_WORK_BTN, TAGS } = cssSelectors;
const TAG = `${TAGS} .tag`;

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
