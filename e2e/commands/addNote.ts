import { NightwatchBrowser } from 'nightwatch';

const ADD_NOTE_BTN = '#add-note-btn';
const TEXTAREA = 'dialog-fullscreen-markdown textarea';
// const ADD_NOTE_SUBMIT_BTN = 'dialog-add-note button[type=submit]:enabled';
const ADD_NOTE_SUBMIT_BTN = '#T-save-note';
const NOTES_WRAPPER = 'notes';
const ROUTER_WRAPPER = '.route-wrapper';

module.exports = {
  async command(this: NightwatchBrowser, noteName: string) {
    return (
      this.waitForElementVisible(ROUTER_WRAPPER)
        // HERE TO AVOID:
        // Error   Error while running .isElementDisplayed() protocol action: stale element reference: stale element not found in the current frame
        .pause(200)
        .setValue('body', 'N')

        .waitForElementVisible(ADD_NOTE_BTN)

        .click(ADD_NOTE_BTN)

        .waitForElementVisible(TEXTAREA)
        .setValue(TEXTAREA, noteName)

        .click(ADD_NOTE_SUBMIT_BTN)
        .moveToElement(NOTES_WRAPPER, 10, 50)
    );
  },
};
