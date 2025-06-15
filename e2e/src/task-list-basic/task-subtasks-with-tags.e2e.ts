import { NBrowser } from '../../n-browser-interface';

const TASK_SEL = 'task';
const TASK_TEXTAREA = 'task textarea';
const SUB_TASKS_CONTAINER = 'task .sub-tasks';
const FIRST_SUB_TASK = '.sub-tasks task:nth-child(1)';
const FIRST_SUB_TASK_TEXTAREA = '.sub-tasks task:nth-child(1) textarea';
const LAST_TASK = 'task:last-child';
const LAST_TASK_TEXTAREA = 'task:last-child textarea';
const TAG_INPUT = 'input[placeholder="Type to add tags"]';
const TAG_AUTOCOMPLETE = 'mat-autocomplete';
const TAG_OPTION_CREATE = 'mat-option.add-item-option';
const CONFIRM_BTN = 'button[e2e="confirmBtn"]';
const SIDE_NAV_TODAY = 'side-nav section.main side-nav-item:first-of-type button';
const SIDE_NAV_TAGS_SECTION = 'side-nav section.tags';
const SIDE_NAV_TAGS_EXPAND = 'side-nav section.tags button.expand-btn';
const TASK_DETAIL_PANEL = '.right-panel';

module.exports = {
  '@tags': ['task', 'NEW', 'sub-task', 'tags'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'should create a task with sub tasks': (browser: NBrowser) =>
    browser
      .addTask('Main Task with Subtasks')
      .waitForElementVisible(TASK_SEL, 5000)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks')
      // Click on the parent task to focus it
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      // Press 'a' to add a subtask
      .sendKeys(LAST_TASK_TEXTAREA, 'a')
      .pause(500)
      // Wait for subtasks container and new empty task
      .waitForElementVisible(SUB_TASKS_CONTAINER, 5000)
      .waitForElementVisible(FIRST_SUB_TASK, 5000)
      // Type directly into the new subtask
      .sendKeys(FIRST_SUB_TASK_TEXTAREA, 'First Subtask')
      .sendKeys(FIRST_SUB_TASK_TEXTAREA, browser.Keys.ENTER)
      .pause(500)
      .assert.valueContains(FIRST_SUB_TASK_TEXTAREA, 'First Subtask'),

  'should add a tag to the sub task': (browser: NBrowser) =>
    browser
      // Click on the subtask to select it
      .click(FIRST_SUB_TASK_TEXTAREA)
      .pause(200)
      // Open task detail panel by clicking the info button
      .moveToElement(FIRST_SUB_TASK, 10, 10)
      .pause(200)
      .click(`${FIRST_SUB_TASK} .show-additional-info-btn`)
      .waitForElementVisible(TASK_DETAIL_PANEL, 5000)
      .pause(500)
      // Add tag via detail panel
      .waitForElementVisible(TAG_INPUT, 5000)
      .click(TAG_INPUT)
      .setValue(TAG_INPUT, 'TestTag')
      .pause(300)
      .waitForElementVisible(TAG_AUTOCOMPLETE, 5000)
      .waitForElementVisible(TAG_OPTION_CREATE, 5000)
      .click(TAG_OPTION_CREATE)
      .pause(300)
      // Confirm tag creation
      .waitForElementVisible(CONFIRM_BTN, 5000)
      .click(CONFIRM_BTN)
      .pause(500)
      // Verify tag was added
      .assert.elementPresent(`${FIRST_SUB_TASK} tag`)
      .assert.textContains(`${FIRST_SUB_TASK} tag .tag-title`, 'TestTag'),

  'should navigate to tag list and verify sub task is there': (browser: NBrowser) =>
    browser
      // Click outside to close detail panel
      .click('body')
      .pause(300)
      // Navigate to tags section
      .waitForElementVisible(SIDE_NAV_TAGS_SECTION, 5000)
      .click(SIDE_NAV_TAGS_EXPAND)
      .pause(300)
      .waitForElementVisible(`${SIDE_NAV_TAGS_SECTION} side-nav-item`, 5000)
      .click(`${SIDE_NAV_TAGS_SECTION} side-nav-item button`)
      .pause(500)
      // Verify sub task is visible in tag view
      .waitForElementVisible('task-list', 5000)
      .assert.elementPresent('task')
      .assert.valueContains('task textarea', 'First Subtask'),

  'should go back to Today list': (browser: NBrowser) =>
    browser
      .waitForElementVisible(SIDE_NAV_TODAY, 5000)
      .click(SIDE_NAV_TODAY)
      .pause(500)
      .waitForElementVisible('task-list', 5000)
      .assert.elementPresent(TASK_SEL)
      .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks'),

  'should add the same tag to the main task': (browser: NBrowser) =>
    browser
      // Click on main task (which should be the last task)
      .click(LAST_TASK_TEXTAREA)
      .pause(200)
      // Open task detail panel
      .moveToElement(LAST_TASK, 10, 10)
      .pause(200)
      .click(`${LAST_TASK} .show-additional-info-btn`)
      .waitForElementVisible(TASK_DETAIL_PANEL, 5000)
      .pause(500)
      // Add tag
      .waitForElementVisible(TAG_INPUT, 5000)
      .click(TAG_INPUT)
      .setValue(TAG_INPUT, 'TestTag')
      .pause(300)
      .waitForElementVisible(TAG_AUTOCOMPLETE, 5000)
      // Select existing tag (not create new)
      .waitForElementVisible('mat-option:not(.add-item-option)', 5000)
      .click('mat-option:not(.add-item-option)')
      .pause(500)
      // Verify tag was added
      .assert.elementPresent(`${LAST_TASK} > .inner-wrapper tag`)
      .assert.textContains(`${LAST_TASK} > .inner-wrapper tag .tag-title`, 'TestTag'),

  'should verify main task appears in tag list with nested sub task': (
    browser: NBrowser,
  ) =>
    browser
      // Click outside to close detail panel
      .click('body')
      .pause(300)
      // Navigate to tag view again
      .click(`${SIDE_NAV_TAGS_SECTION} side-nav-item button`)
      .pause(500)
      // Verify main task is visible
      .waitForElementVisible('task-list', 5000)
      .assert.elementPresent('task:first-of-type')
      .assert.valueContains(
        'task:first-of-type > .inner-wrapper textarea',
        'Main Task with Subtasks',
      )
      // Verify subtask is nested within main task
      .assert.elementPresent('task:first-of-type .sub-tasks')
      .assert.elementPresent('task:first-of-type .sub-tasks task')
      .assert.valueContains(
        'task:first-of-type .sub-tasks task textarea',
        'First Subtask',
      ),

  'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
};
