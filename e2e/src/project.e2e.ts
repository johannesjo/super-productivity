import { BASE } from '../e2e.const';
import { NBrowser } from '../n-browser-interface';

const BASE_URL = `${BASE}`;

const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .expand-btn:first-of-type`;
const CREATE_PROJECT_BTN = `${SIDENAV} section.projects .mat-menu-item:last-of-type`;

const PROJECT_NAME_INPUT = `dialog-create-project input:first-of-type`;
const SUBMIT_BTN = `dialog-create-project button[type=submit]:enabled`;

const PROJECT = `${SIDENAV} section.projects .project`;
const DEFAULT_PROJECT = `${PROJECT}:nth-of-type(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} .mat-menu-item`;
const DEFAULT_PROJECT_ADV_BTN = `${DEFAULT_PROJECT} .project-settings-btn`;

const WORK_CTX_MENU = `work-context-menu`;
const WORK_CTX_TITLE = `.current-work-context-title`;

const PROJECT_SETTINGS_BTN = `${WORK_CTX_MENU} button:last-of-type`;
const SECOND_PROJECT = `${PROJECT}:nth-of-type(2)`;
const SECOND_PROJECT_BTN = `${SECOND_PROJECT} button:first-of-type`;

const BACKLOG = `.backlog`;
const SPLIT = `split`;
const FINISH_DAY_BTN = 'button[routerlink="/active/daily-summary"]';
const READY_TO_WORK_BTN = '.ready-to-work-btn';
const DAILY_SUMMARY = 'daily-summary';
const GLOBAL_ERROR_ALERT = '.global-error-alert';

module.exports = {
  '@tags': ['project'],

  'navigate to project settings': (browser: NBrowser) =>
    browser
      .url(BASE_URL)
      .waitForElementVisible(EXPAND_PROJECT_BTN)
      .click(EXPAND_PROJECT_BTN)
      .waitForElementVisible(DEFAULT_PROJECT_BTN)
      .moveToElement(DEFAULT_PROJECT_BTN, 20, 20)
      .waitForElementVisible(DEFAULT_PROJECT_ADV_BTN)
      .click(DEFAULT_PROJECT_ADV_BTN)
      .waitForElementVisible(WORK_CTX_MENU)
      .waitForElementVisible(PROJECT_SETTINGS_BTN)

      // navigate to
      .click(PROJECT_SETTINGS_BTN)

      .waitForElementVisible('.component-wrapper .mat-h1')
      .assert.containsText('.component-wrapper .mat-h1', 'Project Specific Settings')
      .end(),

  'create project': (browser: NBrowser) =>
    browser
      .url(BASE_URL)
      .waitForElementVisible(EXPAND_PROJECT_BTN)
      .click(EXPAND_PROJECT_BTN)
      .waitForElementVisible(CREATE_PROJECT_BTN)
      .click(CREATE_PROJECT_BTN)
      .waitForElementVisible(PROJECT_NAME_INPUT)
      .setValue(PROJECT_NAME_INPUT, 'Cool Test Project')
      .click(SUBMIT_BTN)

      .waitForElementVisible(SECOND_PROJECT)
      .assert.elementPresent(SECOND_PROJECT)
      .assert.containsText(SECOND_PROJECT, 'Cool Test Project')

      // navigate to
      .waitForElementVisible(SECOND_PROJECT_BTN)
      .click(SECOND_PROJECT_BTN)

      .waitForElementVisible(BACKLOG)
      .waitForElementVisible(SPLIT)
      .assert.containsText(WORK_CTX_TITLE, 'Cool Test Project')
      .end(),

  'navigate to default': (browser: NBrowser) =>
    browser
      .goToDefaultProject()

      .assert.urlEquals(`${BASE}/#/project/DEFAULT/tasks`)
      .assert.containsText(WORK_CTX_TITLE, 'Super Productivity')
      .end(),

  'navigate to daily summary from project without error': (browser: NBrowser) =>
    browser
      // Go to project page
      .goToDefaultProject()

      .click(READY_TO_WORK_BTN)

      // navigate to
      .waitForElementVisible(FINISH_DAY_BTN)
      .click(FINISH_DAY_BTN)

      .waitForElementPresent(DAILY_SUMMARY)
      .assert.urlEquals(`${BASE}/#/project/DEFAULT/daily-summary`)
      .assert.elementNotPresent(GLOBAL_ERROR_ALERT)
      .end(),
};
