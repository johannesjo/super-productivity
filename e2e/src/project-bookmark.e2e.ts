import { NBrowser } from '../n-browser-interface';

const TOGGLE_BOOKMARK_BAR_BTN = '.action-nav button:nth-child(3)';
const BOOKMARK_BAR_OPTS_BTN = 'bookmark-bar .list-controls button:first-of-type';
const ADD_BOOKMARK_BTN = '.mat-menu-panel .mat-menu-item:first-of-type';

const ADD_BOOKMARK_DIALOG = 'dialog-edit-bookmark';
const BOOKMARK_TITLE_INP = `${ADD_BOOKMARK_DIALOG} input[name=title]`;
const BOOKMARK_URL_INP = `${ADD_BOOKMARK_DIALOG} input[name=path]`;
const BOOKMARK_SUBMIT_BTN = `${ADD_BOOKMARK_DIALOG} button[type=submit]:enabled`;

const BOOKMARK = '.global-bookmark-list-inner .global-bookmark';
const FIRST_BOOKMARK = `${BOOKMARK}:first-of-type`;

module.exports = {
  '@tags': ['project', 'bookmark'],

  'create a bookmark': (browser: NBrowser) =>
    browser
      .goToDefaultProject()

      .waitForElementVisible(TOGGLE_BOOKMARK_BAR_BTN)
      .click(TOGGLE_BOOKMARK_BAR_BTN)

      .waitForElementVisible(BOOKMARK_BAR_OPTS_BTN)
      .click(BOOKMARK_BAR_OPTS_BTN)

      .waitForElementVisible(ADD_BOOKMARK_BTN)
      .click(ADD_BOOKMARK_BTN)

      .waitForElementVisible(BOOKMARK_TITLE_INP)
      .setValue(BOOKMARK_TITLE_INP, 'Some bookmark title')
      .waitForElementVisible(BOOKMARK_URL_INP)
      .setValue(BOOKMARK_URL_INP, 'bookmark-url.de')
      .click(BOOKMARK_SUBMIT_BTN)

      .waitForElementVisible(FIRST_BOOKMARK)
      .assert.elementPresent(FIRST_BOOKMARK)
      .assert.containsText(FIRST_BOOKMARK, 'Some bookmark title')
      .end(),
};
