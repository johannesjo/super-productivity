import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { TASK_LIST } = cssSelectors;

const CONFIRM_CREATE_TAG_BTN = `dialog-confirm button[e2e="confirmBtn"]`;
const BASIC_TAG_TITLE = 'task tag-list tag:last-of-type .tag-title';

module.exports = {
  '@tags': ['task', 'short-syntax', 'autocomplete'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should create a simple tag': (browser: NBrowser) => {
    browser
      .waitForElementVisible(TASK_LIST)

      .addTask('some task <3 #basicTag', true)
      .waitForElementPresent(CONFIRM_CREATE_TAG_BTN)
      .click(CONFIRM_CREATE_TAG_BTN)
      .waitForElementPresent(BASIC_TAG_TITLE)

      .assert.elementPresent(BASIC_TAG_TITLE)
      .assert.textContains(BASIC_TAG_TITLE, 'basicTag');
  },

  // TODO make these work again
  // 'should add an autocomplete dropdown when using short syntax': (browser: NBrowser) => {
  //   browser
  //     .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
  //     .waitForElementVisible(FINISH_DAY_BTN)
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
