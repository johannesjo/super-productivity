import { NBrowser } from '../n-browser-interface';
import { cssSelectors, WORK_VIEW_URL } from '../e2e.const';

const AUTOCOMPLETE = 'mention-list';
const { ADD_TASK_GLOBAL_SEL, EXPAND_TAG_BTN, READY_TO_WORK_BTN, ROUTER_WRAPPER, TAGS } =
  cssSelectors;
const TAG = `${TAGS} div.tag`;
const AUTOCOMPLETE_ITEM = `${AUTOCOMPLETE} .mention-active`;
const AUTOCOMPLETE_ITEM_TEXT = `${AUTOCOMPLETE_ITEM} .mention-item`;

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
      .assert.visible(AUTOCOMPLETE_ITEM)
      .expect.element(AUTOCOMPLETE_ITEM_TEXT)
      .text.to.match(/.+/g);
    browser.end();
  },
};
