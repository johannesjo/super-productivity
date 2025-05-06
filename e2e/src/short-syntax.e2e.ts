import { NBrowser } from '../n-browser-interface';
import { BASE, cssSelectors, WORK_VIEW_URL } from '../e2e.const';

const { READY_TO_WORK_BTN, ADD_TASK_GLOBAL_SEL } = cssSelectors;
const CONFIRM_CREATE_TAG_BTN = `dialog-confirm button[e2e="confirmBtn"]`;
const BASIC_TAG_TITLE = 'task tag-list tag:last-of-type .tag-title';
const TASK_TAG_SELECTOR = 'task tag-list tag';
const TASK = 'task';
const TASK_TAGS = 'task tag';
const WORK_VIEW_URL_FULL = `${BASE}/`;

module.exports = {
  '@tags': ['task', 'short-syntax', 'autocomplete', 'work-view'],

  'should add task with project via short syntax': (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL_FULL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .addTask('0 test task koko +i')
      .waitForElementVisible(TASK)
      .assert.visible(TASK)
      .assert.containsText(TASK_TAGS, 'Inbox')
      .end(),

  'should add a task with repeated tags but only append one instance': (
    browser: NBrowser,
  ) => {
    browser
      .loadAppAndClickAwayWelcomeDialog(WORK_VIEW_URL)
      .waitForElementVisible(READY_TO_WORK_BTN)
      .setValue('body', 'A')
      .waitForElementVisible(ADD_TASK_GLOBAL_SEL)
      .setValue(ADD_TASK_GLOBAL_SEL, `Test creating new tag #duplicateTag #duplicateTag`)
      .setValue(ADD_TASK_GLOBAL_SEL, browser.Keys.ENTER)
      .waitForElementPresent(CONFIRM_CREATE_TAG_BTN)
      .click(CONFIRM_CREATE_TAG_BTN)
      .waitForElementPresent(BASIC_TAG_TITLE)

      // Ensure the tag is present
      .assert.elementPresent(BASIC_TAG_TITLE)
      .assert.textContains(BASIC_TAG_TITLE, 'duplicateTag')

      // Verify that only one tag is appended
      .elements(`css selector`, TASK_TAG_SELECTOR, (result) => {
        if (Array.isArray(result.value)) {
          console.log(result);

          console.log('Number of tags found for this task:', result.value.length);
          // Assert that only one tag is appended to this task
          browser.assert.strictEqual(
            result.value.length,
            1,
            `Expected 1 tags for this task, but found ${result.value.length}`,
          );
        } else {
          console.error('Unexpected result format:', result.value);
          browser.assert.fail('Failed to retrieve elements correctly');
        }
      })
      .end();
  },
};
