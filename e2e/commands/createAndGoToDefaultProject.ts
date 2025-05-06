import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const BASE_URL = `${BASE}`;

const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .projects .expand-btn`;

const PROJECT = `${SIDENAV} section.projects side-nav-item`;
const DEFAULT_PROJECT = `${PROJECT}:nth-of-type(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} > button:first-of-type`;

const TASK_LIST = `task-list`;
const PROJECT_ACCORDION = '.projects button';
const ADD_PROJECT_BTN = '.e2e-add-project-btn';
const PROJECT_NAME_INPUT = `dialog-create-project input:first-of-type`;
const SUBMIT_BTN = `dialog-create-project button[type=submit]:enabled`;

module.exports = {
  async command(this: NBrowser) {
    return (
      this.loadAppAndClickAwayWelcomeDialog(BASE_URL)
        .pause(50)
        .moveToElement(PROJECT_ACCORDION, 20, 15)
        .waitForElementVisible(ADD_PROJECT_BTN)
        .click(ADD_PROJECT_BTN)
        // .click('mat-sidenav button.mat-mdc-tooltip-trigger > mat-icon')
        .waitForElementVisible(PROJECT_NAME_INPUT)
        .setValue(PROJECT_NAME_INPUT, 'First Test Project')
        .click(SUBMIT_BTN)

        .waitForElementVisible(EXPAND_PROJECT_BTN)
        .click(EXPAND_PROJECT_BTN)

        .waitForElementVisible(DEFAULT_PROJECT_BTN)
        .click(DEFAULT_PROJECT_BTN)
        .waitForElementVisible(TASK_LIST)
    );
  },
};
