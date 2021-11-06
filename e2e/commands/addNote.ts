import { NightwatchBrowser } from 'nightwatch';

const ADD_NOTE_BTN = '#add-note-btn';
const NOTE_PANEL_BTN = '.toggle-notes-btn';
const TEXTAREA = 'dialog-add-note textarea';
const ADD_NOTE_SUBMIT_BTN = 'dialog-add-note button[type=submit]:enabled';
const NOTES_WRAPPER = 'notes';

module.exports = {
  async command(this: NightwatchBrowser, noteName: string) {
    return this.waitForElementPresent(NOTE_PANEL_BTN)
      .click(NOTE_PANEL_BTN)
      .waitForElementPresent(ADD_NOTE_BTN)
      .click(ADD_NOTE_BTN)

      .waitForElementPresent(TEXTAREA)
      .setValue(TEXTAREA, noteName)

      .click(ADD_NOTE_SUBMIT_BTN)
      .moveToElement(NOTES_WRAPPER, 10, 50);
  },
};
