import {NightwatchBrowser} from 'nightwatch';
import {BASE} from '../e2e.const';
import {NBrowser} from '../n-browser-interface';

const BASE_URL = `${BASE}`;

const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .expand-btn:first-of-type`;

const PROJECT = `${SIDENAV} section.projects .project`;
const DEFAULT_PROJECT = `${PROJECT}:nth-of-type(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} .mat-menu-item`;

const ADD_NOTE_BTN = '#add-note-btn';
const TEXTAREA = 'dialog-add-note textarea';
const ADD_NOTE_SUBMIT_BTN = 'dialog-add-note button[type=submit]';
const NOTES_WRAPPER = 'notes';
const NOTE = 'notes note';
const FIRST_NOTE = `${NOTE}:first-of-type`;


module.exports = {
  '@tags': ['project', 'note', 'bookmark'],

  'create a note': (browser: NBrowser) => browser
    .goToDefaultProject()

    .moveToElement(NOTES_WRAPPER, 10, 50)
    .waitForElementPresent(ADD_NOTE_BTN)
    .click(ADD_NOTE_BTN)

    .waitForElementPresent(TEXTAREA)
    .setValue(TEXTAREA, 'Some new Note')

    .click(ADD_NOTE_SUBMIT_BTN)
    .moveToElement(NOTES_WRAPPER, 10, 50)
    .waitForElementVisible(FIRST_NOTE)
    .assert.elementPresent(FIRST_NOTE)
    .assert.containsText(FIRST_NOTE, 'Some new Note')
    .end(),

};
