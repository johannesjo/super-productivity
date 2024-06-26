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
  'autocomplete dropdown should contain at least one tag': (browser: NBrowser) => {
    let newTagTitle = 'angular';
    browser
      .loadAppAndClickAwayWelcomeDialog()
      .waitForElementVisible(EXPAND_TAG_BTN)
      .click(EXPAND_TAG_BTN)
      .execute(
        (tagSelector) => {
          const tagElem = document.querySelector(tagSelector);
          if (!tagElem) {
            return false;
          }
          return true;
        },
        [TAG],
        function (result) {
          console.log('Has at least one tag', result.value);
          if (!result.value) {
            browser.addTaskWithNewTag(newTagTitle);
          }
        },
      );
    browser
      .draftTask('Test the presence of tag in autcomplete #')
      .waitForElementPresent(AUTOCOMPLETE)
      .assert.visible(ACTIVE_AUTOCOMPLETE_ITEM)
      .expect.element(ACTIVE_AUTOCOMPLETE_ITEM_TEXT)
      .text.to.match(/.+/g);
    browser.end();
  },
};
