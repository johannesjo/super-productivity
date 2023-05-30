import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const BASE_URL = `${BASE}`;

const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .expand-btn:first-of-type`;

const PROJECT = `${SIDENAV} section.projects .project`;
const DEFAULT_PROJECT = `${PROJECT}:nth-of-type(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} .mat-menu-item`;

const TASK_LIST = `task-list`;

module.exports = {
  async command(this: NBrowser) {
    return this.loadAppAndClickAwayWelcomeDialog(BASE_URL)
      .waitForElementVisible(EXPAND_PROJECT_BTN)
      .click(EXPAND_PROJECT_BTN)
      .waitForElementVisible(DEFAULT_PROJECT_BTN)
      .click(DEFAULT_PROJECT_BTN)
      .waitForElementVisible(TASK_LIST);
  },
};
