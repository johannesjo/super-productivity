import { NBrowser } from '../n-browser-interface';
/* eslint-disable @typescript-eslint/naming-convention */

const NOTES_WRAPPER = 'notes';
const NOTE = 'notes note';
const FIRST_NOTE = `${NOTE}:first-of-type`;
const TOGGLE_NOTES_BTN = '.toggle-notes-btn';

module.exports = {
  '@tags': ['note'],

  'create a note': (browser: NBrowser) =>
    browser
      .goToDefaultProject()
      .addNote('Some new Note')

      .moveToElement(NOTES_WRAPPER, 10, 50)
      .waitForElementVisible(FIRST_NOTE)
      .assert.textContains(FIRST_NOTE, 'Some new Note')
      .end(),

  'new note should be still available after reload': (browser: NBrowser) =>
    browser
      .goToDefaultProject()

      .addNote('Some new Note')
      // wait for save
      .pause(200)
      .execute('window.location.reload()')
      .waitForElementPresent(TOGGLE_NOTES_BTN)
      .click(TOGGLE_NOTES_BTN)
      .waitForElementPresent(NOTES_WRAPPER)
      .moveToElement(NOTES_WRAPPER, 10, 50)
      .waitForElementVisible(FIRST_NOTE)
      .assert.elementPresent(FIRST_NOTE)
      .assert.textContains(FIRST_NOTE, 'Some new Note')
      .end(),
};
