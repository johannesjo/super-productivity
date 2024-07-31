import { NBrowser } from '../n-browser-interface';
import { cssSelectors, WORK_VIEW_URL } from '../e2e.const';

// const AUTOCOMPLETE = 'mention-list';
// const AUTOCOMPLETE_ITEM = `${AUTOCOMPLETE} .mention-active`;
// const AUTOCOMPLETE_ITEM_TEXT = `${AUTOCOMPLETE_ITEM} .mention-item`;
// const { EXPAND_TAG_BTN, READY_TO_WORK_BTN, TAGS } = cssSelectors;
// const TAG = `${TAGS} div.tag`;
const { READY_TO_WORK_BTN } = cssSelectors;
const CONFIRM_CREATE_TAG_BTN = `dialog-confirm button[e2e="confirmBtn"]`;
const BASIC_TAG_TITLE = 'task tag-list tag:last-of-type .tag-title';

module.exports = {
  '@tags': ['task', 'short-syntax', 'autocomplete'],

  'should create a simple tag': (browser: NBrowser) => {
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)

      .addTask('some task <3 #basicTag', true)
      .waitForElementPresent(CONFIRM_CREATE_TAG_BTN)
      .click(CONFIRM_CREATE_TAG_BTN)
      .waitForElementPresent(BASIC_TAG_TITLE)

      .assert.elementPresent(BASIC_TAG_TITLE)
      .assert.textContains(BASIC_TAG_TITLE, 'basicTag')
      .end();
  },

  // TODO make these work again
  // 'should add an autocomplete dropdown when using short syntax': (browser: NBrowser) => {
  //   browser
  //     .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
  //     .waitForElementVisible(READY_TO_WORK_BTN)
  //
  //     .addTask('some task <3 #basicTag', true)
  //     .waitForElementPresent(CONFIRM_CREATE_TAG_BTN)
  //     .click(CONFIRM_CREATE_TAG_BTN)
  //     .waitForElementPresent(BASIC_TAG_TITLE)
  //
  //     .draftTask('Test the presence of autocomplete component #')
  //     .waitForElementPresent(AUTOCOMPLETE)
  //     .assert.elementPresent(AUTOCOMPLETE)
  //     .end();
  // },
  //
  // 'should have at least one tag in the autocomplete dropdown': (browser: NBrowser) => {
  //   const newTagTitle = 'angular';
  //   browser
  //     .loadAppAndClickAwayWelcomeDialog()
  //
  //     .addTask('some task <3 #basicTag', true)
  //     .waitForElementPresent(CONFIRM_CREATE_TAG_BTN)
  //     .click(CONFIRM_CREATE_TAG_BTN)
  //     .waitForElementPresent(BASIC_TAG_TITLE)
  //
  //     .waitForElementVisible(EXPAND_TAG_BTN)
  //     .click(EXPAND_TAG_BTN)
  //     .execute(
  //       (tagSelector) => {
  //         const tagElem = document.querySelector(tagSelector);
  //         if (!tagElem) {
  //           return false;
  //         }
  //         return true;
  //       },
  //       [TAG],
  //       (result) => {
  //         console.log('Has at least one tag', result.value);
  //         if (!result.value) {
  //           browser.addTaskWithNewTag(newTagTitle);
  //         }
  //       },
  //     );
  //   browser
  //     .draftTask('Test the presence of tag in autcomplete #')
  //     .waitForElementPresent(AUTOCOMPLETE)
  //     .assert.visible(AUTOCOMPLETE_ITEM)
  //     .expect.element(AUTOCOMPLETE_ITEM_TEXT)
  //     .text.to.match(/.+/g);
  //   browser.end();
  // },
};
