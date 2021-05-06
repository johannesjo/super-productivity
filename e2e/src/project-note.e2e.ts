import { NBrowser } from '../n-browser-interface';

const NOTES_WRAPPER = 'notes';
const NOTE = 'notes note';
const FIRST_NOTE = `${NOTE}:first-of-type`;

module.exports = {
  '@tags': ['project', 'note'],

  'create a note': (browser: NBrowser) =>
    browser
      .goToDefaultProject()
      .addNote('Some new Note')

      .moveToElement(NOTES_WRAPPER, 10, 50)
      .waitForElementVisible(FIRST_NOTE)
      .assert.elementPresent(FIRST_NOTE)
      .assert.containsText(FIRST_NOTE, 'Some new Note')
      .end(),

  'new note should be still available after reload': (browser: NBrowser) =>
    browser
      .goToDefaultProject()
      .addNote('Some new Note')
      .execute('window.location.reload()')
      .waitForElementPresent(NOTES_WRAPPER)
      .moveToElement(NOTES_WRAPPER, 10, 50)
      .waitForElementVisible(FIRST_NOTE)
      .assert.elementPresent(FIRST_NOTE)
      .assert.containsText(FIRST_NOTE, 'Some new Note')
      .end(),
};
