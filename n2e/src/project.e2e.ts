import {NightwatchBrowser} from 'nightwatch';
import {BASE} from '../e2e.const';

const URL = `${BASE}`;
const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .expand-btn:first-of-type`;
const CREATE_PROJECT_BTN = `${SIDENAV} section.projects .mat-menu-item:last-of-type`;
const PROJECT_NAME_INPUT = `dialog-create-project input:first-of-type`;
const SUBMIT_BTN = `dialog-create-project button[type=submit]`;
const PROJECT = `${SIDENAV} section.projects .project`;
const SECOND_PROJECT = `${PROJECT}:nth-child(2)`;

module.exports = {
  '@tags': ['project'],
  'create project': (browser: NightwatchBrowser) => browser
    .url(URL)
    .waitForElementVisible(SIDENAV)
    .waitForElementVisible(EXPAND_PROJECT_BTN)
    .click(EXPAND_PROJECT_BTN)
    .waitForElementVisible(CREATE_PROJECT_BTN)
    .click(CREATE_PROJECT_BTN)
    .waitForElementVisible(PROJECT_NAME_INPUT)
    .setValue(PROJECT_NAME_INPUT, 'Cool Test Project')
    .click(SUBMIT_BTN)
    .assert.elementPresent(SECOND_PROJECT)
    .assert.containsText(SECOND_PROJECT, 'Cool Test Project')
    .end(),
};
