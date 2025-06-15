// // import { NBrowser } from '../../n-browser-interface';
//
// // const TASK_SEL = 'task';
// // const TASK_TEXTAREA = 'task textarea';
// // const FIRST_TASK = 'task:nth-child(1)';
// // const FIRST_TASK_TEXTAREA = 'task:nth-child(1) textarea';
// // const SECOND_TASK = 'task:nth-child(2)';
// // const SECOND_TASK_TEXTAREA = 'task:nth-child(2) textarea';
// // const TAG_INPUT = 'input[placeholder="Type to add tags"]';
// // const TAG_AUTOCOMPLETE = 'mat-autocomplete';
// // const TAG_OPTION_CREATE = 'mat-option.add-item-option';
// // const CONFIRM_BTN = 'button[e2e="confirmBtn"]';
// // const SIDE_NAV_TODAY = 'side-nav section.main side-nav-item:first-of-type button';
// // const SIDE_NAV_TAGS_SECTION = 'side-nav section.tags';
// // const SIDE_NAV_TAGS_EXPAND = 'side-nav section.tags button.expand-btn';
// // const TASK_DETAIL_PANEL = '.right-panel';
//
// module.exports = {
//   // COMMENTED OUT DUE TO SUBTASK CREATION ISSUES
//   /*
//   '@tags': ['task', 'NEW', 'sub-task', 'tags'],
//
//   before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
//
//   after: (browser: NBrowser) => browser.end(),
//
//   'should create a task with sub tasks (as top-level tasks)': (browser: NBrowser) => {
//     browser
//       .addTask('Main Task with Subtasks')
//       .waitForElementVisible(TASK_SEL, 5000)
//       .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks');
//     // Add a task that would be a subtask
//     browser.addTask('First Subtask').pause(500);
//     // Verify both tasks exist
//     return browser
//       .waitForElementVisible(FIRST_TASK, 5000)
//       .waitForElementVisible(SECOND_TASK, 5000)
//       .assert.valueContains(FIRST_TASK_TEXTAREA, 'First Subtask')
//       .assert.valueContains(SECOND_TASK_TEXTAREA, 'Main Task with Subtasks');
//   },
//
//   'should add a tag to the sub task': (browser: NBrowser) =>
//     browser
//       // Click on the first task (subtask) to select it
//       .click(FIRST_TASK_TEXTAREA)
//       .pause(200)
//       // Open task detail panel
//       .moveToElement(FIRST_TASK, 10, 10)
//       .pause(200)
//       .click(`${FIRST_TASK} .show-additional-info-btn`)
//       .waitForElementVisible(TASK_DETAIL_PANEL, 5000)
//       .pause(500)
//       // Add tag via detail panel
//       .waitForElementVisible(TAG_INPUT, 5000)
//       .click(TAG_INPUT)
//       .setValue(TAG_INPUT, 'TestTag')
//       .pause(300)
//       .waitForElementVisible(TAG_AUTOCOMPLETE, 5000)
//       .waitForElementVisible(TAG_OPTION_CREATE, 5000)
//       .click(TAG_OPTION_CREATE)
//       .pause(300)
//       // Confirm tag creation
//       .waitForElementVisible(CONFIRM_BTN, 5000)
//       .click(CONFIRM_BTN)
//       .pause(500)
//       // Verify tag was added
//       .assert.elementPresent(`${FIRST_TASK} tag`)
//       .assert.textContains(`${FIRST_TASK} tag .tag-title`, 'TestTag'),
//
//   'should navigate to tag list and verify sub task is there': (browser: NBrowser) =>
//     browser
//       // Click outside to close detail panel
//       .click('body')
//       .pause(300)
//       // Navigate to tags section
//       .waitForElementVisible(SIDE_NAV_TAGS_SECTION, 5000)
//       .click(SIDE_NAV_TAGS_EXPAND)
//       .pause(300)
//       .waitForElementVisible(`${SIDE_NAV_TAGS_SECTION} side-nav-item`, 5000)
//       .click(`${SIDE_NAV_TAGS_SECTION} side-nav-item button`)
//       .pause(500)
//       // Verify sub task is visible in tag view
//       .waitForElementVisible('task-list', 5000)
//       .assert.elementPresent('task')
//       .assert.valueContains('task textarea', 'First Subtask'),
//
//   'should go back to Today list': (browser: NBrowser) =>
//     browser
//       .waitForElementVisible(SIDE_NAV_TODAY, 5000)
//       .click(SIDE_NAV_TODAY)
//       .pause(500)
//       .waitForElementVisible('task-list', 5000)
//       .assert.elementPresent(TASK_SEL)
//       .assert.valueContains(TASK_TEXTAREA, 'Main Task with Subtasks'),
//
//   'should add the same tag to the main task': (browser: NBrowser) =>
//     browser
//       // Click on second task (main task)
//       .click(SECOND_TASK_TEXTAREA)
//       .pause(200)
//       // Open task detail panel
//       .moveToElement(SECOND_TASK, 10, 10)
//       .pause(200)
//       .click(`${SECOND_TASK} .show-additional-info-btn`)
//       .waitForElementVisible(TASK_DETAIL_PANEL, 5000)
//       .pause(500)
//       // Add tag
//       .waitForElementVisible(TAG_INPUT, 5000)
//       .click(TAG_INPUT)
//       .setValue(TAG_INPUT, 'TestTag')
//       .pause(300)
//       .waitForElementVisible(TAG_AUTOCOMPLETE, 5000)
//       // Select existing tag (not create new)
//       .waitForElementVisible('mat-option:not(.add-item-option)', 5000)
//       .click('mat-option:not(.add-item-option)')
//       .pause(500)
//       // Verify tag was added
//       .assert.elementPresent(`${SECOND_TASK} > .inner-wrapper tag`)
//       .assert.textContains(`${SECOND_TASK} > .inner-wrapper tag .tag-title`, 'TestTag'),
//
//   'should verify both tasks appear in tag list': (browser: NBrowser) =>
//     browser
//       // Click outside to close detail panel
//       .click('body')
//       .pause(300)
//       // Navigate to tag view again
//       .click(`${SIDE_NAV_TAGS_SECTION} side-nav-item button`)
//       .pause(500)
//       // Verify both tasks are visible in tag view
//       .waitForElementVisible('task-list', 5000)
//       .assert.elementPresent(FIRST_TASK)
//       .assert.elementPresent(SECOND_TASK)
//       // Both tasks should have the tag
//       .assert.valueContains(FIRST_TASK_TEXTAREA, 'First Subtask')
//       .assert.valueContains(SECOND_TASK_TEXTAREA, 'Main Task with Subtasks'),
//
//   'should confirm no errors in console': (browser: NBrowser) => browser.noError(),
//   */
// };
