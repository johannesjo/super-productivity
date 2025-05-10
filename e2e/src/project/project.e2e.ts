import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { WORK_VIEW } = cssSelectors;

/* eslint-disable @typescript-eslint/naming-convention */

const SIDENAV = `side-nav`;
const CREATE_PROJECT_BTN = `${SIDENAV} section.projects .g-multi-btn-wrapper > button:last-of-type`;
const PROJECT_ACCORDION = '.projects button';

const PROJECT_NAME_INPUT = `dialog-create-project input:first-of-type`;
const SUBMIT_BTN = `dialog-create-project button[type=submit]:enabled`;

const PROJECT = `${SIDENAV} section.projects side-nav-item`;
const DEFAULT_PROJECT = `${PROJECT}:nth-of-type(1)`;
const DEFAULT_PROJECT_BTN = `${DEFAULT_PROJECT} .mat-mdc-menu-item`;
const DEFAULT_PROJECT_ADV_BTN = `${DEFAULT_PROJECT} .additional-btn`;

const WORK_CTX_MENU = `work-context-menu`;
const WORK_CTX_TITLE = `.current-work-context-title`;

const PROJECT_SETTINGS_BTN = `${WORK_CTX_MENU} button:nth-of-type(4)`;
const SECOND_PROJECT = `${PROJECT}:nth-of-type(2)`;
const SECOND_PROJECT_BTN = `${SECOND_PROJECT} button:first-of-type`;

const MOVE_TO_ARCHIVE_BTN = '.e2e-move-done-to-archive';
const GLOBAL_ERROR_ALERT = '.global-error-alert';

module.exports = {
  '@tags': ['project'],

  before: (browser: NBrowser) =>
    browser.loadAppAndClickAwayWelcomeDialog().createAndGoToDefaultProject(),
  after: (browser: NBrowser) => browser.end(),

  'move done tasks to archive without error': (browser: NBrowser) =>
    browser
      .click(WORK_VIEW)
      .addTask('Test task 1')
      .addTask('Test task 2')
      .moveToElement('task', 12, 12)
      .waitForElementVisible('.task-done-btn')
      .click('.task-done-btn')
      // workaround for weird collapsible state during headless ???
      .execute(
        (moveToArchiveBtnSelector) => {
          if (!document.querySelector(moveToArchiveBtnSelector)) {
            const header = document.querySelector('.collapsible-header');
            if (header) (header as HTMLElement).click();
          }
          return true;
        },
        [MOVE_TO_ARCHIVE_BTN],
      )
      .pause(100) // Give time for the header to expand if needed
      .waitForElementVisible(MOVE_TO_ARCHIVE_BTN)
      .click(MOVE_TO_ARCHIVE_BTN)
      .pause(500)
      .assert.elementPresent('task:nth-child(1)')
      .assert.not.elementPresent(GLOBAL_ERROR_ALERT),

  'create second project': (browser: NBrowser) =>
    browser
      .moveToElement(PROJECT_ACCORDION, 20, 15)

      .waitForElementVisible(CREATE_PROJECT_BTN)
      .click(CREATE_PROJECT_BTN)
      .waitForElementVisible(PROJECT_NAME_INPUT)
      .setValue(PROJECT_NAME_INPUT, 'Cool Test Project')
      .click(SUBMIT_BTN)

      .waitForElementVisible(SECOND_PROJECT)
      .assert.elementPresent(SECOND_PROJECT)
      .assert.textContains(SECOND_PROJECT, 'Cool Test Project')

      // navigate to
      .waitForElementVisible(SECOND_PROJECT_BTN)
      .click(SECOND_PROJECT_BTN)

      // .waitForElementVisible(BACKLOG)
      // .waitForElementVisible(SPLIT)
      .assert.textContains(WORK_CTX_TITLE, 'Cool Test Project'),

  'navigate to project settings': (browser: NBrowser) =>
    browser
      .waitForElementVisible(DEFAULT_PROJECT)
      .waitForElementVisible(DEFAULT_PROJECT_BTN)
      .moveToElement(DEFAULT_PROJECT_BTN, 20, 20)
      .waitForElementVisible(DEFAULT_PROJECT_ADV_BTN)
      .click(DEFAULT_PROJECT_ADV_BTN)
      .waitForElementVisible(WORK_CTX_MENU)
      .waitForElementVisible(PROJECT_SETTINGS_BTN)

      // navigate to
      .click(PROJECT_SETTINGS_BTN)

      .waitForElementVisible('.component-wrapper .mat-h1')
      .assert.textContains('.component-wrapper .mat-h1', 'Project Specific Settings')
      .click('body'),
};
