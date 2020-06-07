import {NightwatchBrowser} from 'nightwatch';
import {BASE} from '../e2e.const';

const BASE_URL = `${BASE}`;
const DEFAULT_PROJECT_TASKS_URL = `${BASE}/project/DEFAULT/tasks`;
const DEFAULT_PROJECT_SETTINGS_URL = `${BASE}/project/DEFAULT/settings`;

const SIDENAV = `side-nav`;
const EXPAND_PROJECT_BTN = `${SIDENAV} .expand-btn:first-of-type`;
const CREATE_PROJECT_BTN = `${SIDENAV} section.projects .mat-menu-item:last-of-type`;
const PROJECT_NAME_INPUT = `dialog-create-project input:first-of-type`;
const SUBMIT_BTN = `dialog-create-project button[type=submit]`;
const PROJECT = `${SIDENAV} section.projects .project`;
const DEFAULT_PROJECT = `${PROJECT}:nth-child(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} .mat-menu-item`;
const DEFAULT_PROJECT_ADV_BTN = `${DEFAULT_PROJECT} .project-settings-btn`;
const WORK_CTX_MENU = `work-context-menu`;
const PROJECT_SETTINGS_BTN = `${WORK_CTX_MENU} button:last-of-type`;
const SECOND_PROJECT = `${PROJECT}:nth-child(2)`;
const WORK_CONTEXT_TITLE = `.current-work-context-title`;
const BACKLOG = `.backlog`;
const SPLIT = `split`;
const FINISH_DAY_BTN = '.finish-day-button-wrapper button';
const READY_TO_WORK_BTN = '.ready-to-work-btn';
const DAILY_SUMMARY = 'daily-summary';
const GLOBAL_ERROR_ALERT = '.global-error-alert';

module.exports = {
  '@tags': ['project'],

  'navigate to project settings': (browser: NightwatchBrowser) => browser
    .url(BASE_URL)
    .waitForElementVisible(EXPAND_PROJECT_BTN)
    .click(EXPAND_PROJECT_BTN)
    .waitForElementVisible(DEFAULT_PROJECT_BTN)
    .moveToElement(DEFAULT_PROJECT_BTN, 20, 20)
    .waitForElementVisible(DEFAULT_PROJECT_ADV_BTN)
    .click(DEFAULT_PROJECT_ADV_BTN)
    .waitForElementVisible(WORK_CTX_MENU)
    .waitForElementVisible(PROJECT_SETTINGS_BTN)
    .click(PROJECT_SETTINGS_BTN)
    .waitForElementVisible('.component-wrapper .mat-h1')
    .waitForElementVisible('.component-wrapper .mat-h1')
    .assert.containsText('.component-wrapper .mat-h1', 'Project Specific Settings')
    .end(),

  'create project': (browser: NightwatchBrowser) => browser
    .url(BASE_URL)
    .waitForElementVisible(EXPAND_PROJECT_BTN)
    .click(EXPAND_PROJECT_BTN)
    .waitForElementVisible(CREATE_PROJECT_BTN)
    .click(CREATE_PROJECT_BTN)
    .waitForElementVisible(PROJECT_NAME_INPUT)
    .setValue(PROJECT_NAME_INPUT, 'Cool Test Project')
    .click(SUBMIT_BTN)
    .assert.elementPresent(SECOND_PROJECT)
    .assert.containsText(SECOND_PROJECT, 'Cool Test Project')
    // navigate to
    .click(SECOND_PROJECT)
    .waitForElementVisible(BACKLOG)
    .waitForElementVisible(SPLIT)
    .assert.containsText(WORK_CONTEXT_TITLE, 'Cool Test Project')
    .end(),

  'navigate to default': (browser: NightwatchBrowser) => browser
    .url(BASE_URL)
    .waitForElementVisible(EXPAND_PROJECT_BTN)
    .click(EXPAND_PROJECT_BTN)
    .waitForElementVisible(DEFAULT_PROJECT_BTN)
    .click(DEFAULT_PROJECT_BTN)
    .waitForElementVisible(BACKLOG)
    .assert.containsText(WORK_CONTEXT_TITLE, 'Super Productivity')
    .end(),

  'navigate to daily summary from project without error': (browser: NightwatchBrowser) => browser
    // Go to project page
    .url(BASE_URL)
    .waitForElementVisible(EXPAND_PROJECT_BTN)
    .click(EXPAND_PROJECT_BTN)
    .waitForElementVisible(DEFAULT_PROJECT_BTN)
    .click(DEFAULT_PROJECT_BTN)
    .waitForElementVisible(SPLIT)

    .click(READY_TO_WORK_BTN)
    .waitForElementVisible(FINISH_DAY_BTN)
    .click(FINISH_DAY_BTN)

    // this fails often for some reason...
    .waitForElementPresent(DAILY_SUMMARY)
    .assert.elementNotPresent(GLOBAL_ERROR_ALERT)
    .end(),
};
