// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { NBrowser } from '../../n-browser-interface';
// import { cssSelectors } from '../../e2e.const';
//
// const { SIDENAV, WORK_VIEW, TASK_LIST } = cssSelectors;
//
// /* eslint-disable @typescript-eslint/naming-convention */
//
// // Plugin-related selectors
// const PLUGIN_MENU_ITEM = `${SIDENAV} plugin-menu button`;
// const PLUGIN_IFRAME = '.plugin-iframe';
// const SNACK_BAR = 'mat-snack-bar';
// const SNACK_MESSAGE = `${SNACK_BAR} .mat-mdc-snack-bar-label`;
//
// // Iframe content selectors (used within iframe context)
// const IFRAME_TITLE = 'h1';
// const STATS_SECTION = '.section:nth-of-type(1)';
// const TASK_COUNT = '#taskCount';
// const PROJECT_COUNT = '#projectCount';
// const TAG_COUNT = '#tagCount';
// const NOTIFICATION_BTN = 'button:first-of-type';
// const REFRESH_STATS_BTN = 'button:nth-of-type(2)';
// const CREATE_TASK_BTN = 'button:nth-of-type(3)';
// const SAVE_DATA_BTN = 'button:nth-of-type(4)';
// const ACTIVITY_LOG = '#activityLog';
// const LOG_ENTRY = '.log-entry';
//
// module.exports = {
//   '@tags': ['plugins', 'iframe'],
//
//   before: (browser: NBrowser) =>
//     browser
//       .loadAppAndClickAwayWelcomeDialog()
//       .createAndGoToDefaultProject()
//       .enableTestPlugin('API Test Plugin')
//       .url('http://localhost:4200') // Navigate to work view
//       .pause(1000), // Wait for navigation
//
//   after: (browser: NBrowser) => browser.end(),
//
//   'setup test data': (browser: NBrowser) =>
//     browser
//       // Add some tasks for testing
//       .addTask('Test Task 1')
//       .addTask('Test Task 2')
//       .addTask('Test Task 3')
//       .pause(1000),
//
//   'open plugin iframe view': (browser: NBrowser) =>
//     browser
//       // First check if the plugin menu has any buttons
//       .execute(
//         () => {
//           const pluginMenu = document.querySelector('side-nav plugin-menu');
//           const buttons = pluginMenu ? pluginMenu.querySelectorAll('button') : [];
//           return {
//             pluginMenuExists: !!pluginMenu,
//             buttonCount: buttons.length,
//             buttonTexts: Array.from(buttons).map((btn) => btn.textContent?.trim() || ''),
//           };
//         },
//         [],
//         (result) => {
//           console.log('Plugin menu state:', result.value);
//           if (
//             result.value &&
//             typeof result.value === 'object' &&
//             'buttonCount' in result.value
//           ) {
//             browser.assert.ok(
//               result.value.buttonCount > 0,
//               'Plugin menu should have at least one button',
//             );
//           }
//         },
//       )
//       .waitForElementVisible(PLUGIN_MENU_ITEM)
//       .click(PLUGIN_MENU_ITEM)
//       .pause(1000)
//       .assert.urlContains('/plugins/api-test-plugin/index')
//       .waitForElementVisible(PLUGIN_IFRAME)
//       .pause(1000), // Wait for iframe content to load
//
//   'verify iframe loads with correct content': (browser: NBrowser) =>
//     browser
//       .frame(0) // Switch to iframe context
//       .waitForElementVisible(IFRAME_TITLE)
//       .assert.textContains(IFRAME_TITLE, 'API Test Plugin')
//       .assert.elementPresent(STATS_SECTION)
//       .assert.elementPresent(ACTIVITY_LOG)
//       // Skip checking initial log entry as it's empty on load
//       .frameParent(), // Switch back to parent
//
//   'test stats loading in iframe': (browser: NBrowser) =>
//     browser
//       .frame(0)
//       .waitForElementVisible(TASK_COUNT)
//       // Stats should auto-load on init, check values
//       .pause(1000) // Wait for stats to load
//       .getText(TASK_COUNT, (result) => {
//         const value = typeof result.value === 'string' ? result.value : '';
//         browser.assert.equal(value, '3', 'Should show 3 tasks');
//       })
//       .getText(PROJECT_COUNT, (result) => {
//         // Should have at least the default project
//         const value = typeof result.value === 'string' ? result.value : '0';
//         browser.assert.ok(parseInt(value) >= 1, 'Should have at least 1 project');
//       })
//       .getText(TAG_COUNT, (result) => {
//         // Should have at least the test tag we created
//         const value = typeof result.value === 'string' ? result.value : '0';
//         browser.assert.ok(parseInt(value) >= 1, 'Should have at least 1 tag');
//       })
//       .frameParent(),
//
//   'test refresh stats button': (browser: NBrowser) =>
//     browser
//       .frame(0)
//       .click(REFRESH_STATS_BTN)
//       .pause(500)
//       // Check that a new log entry appears
//       .elements('css selector', LOG_ENTRY, (result) => {
//         const count = Array.isArray(result.value) ? result.value.length : 0;
//         browser.assert.ok(count >= 3, 'Should have multiple log entries after refresh');
//       })
//       .frameParent(),
//
//   // 'test show notification from iframe': (browser: NBrowser) =>
//   //   browser
//   //     .frame(0)
//   //     .click(NOTIFICATION_BTN)
//   //     .frameParent()
//   //     .waitForElementVisible(SNACK_BAR)
//   //     .assert.textContains(SNACK_MESSAGE, 'Notification from plugin iframe')
//   //     .pause(3000), // Wait for notification to disappear
//
//   // 'test create task from iframe': (browser: NBrowser) =>
//   //   browser
//   //     .frame(0)
//   //     .click(CREATE_TASK_BTN)
//   //     .frameParent()
//   //     .waitForElementVisible(SNACK_BAR)
//   //     .assert.textContains(SNACK_MESSAGE, 'Created task:')
//   //     .pause(3000)
//   //     // Verify task was actually created
//   //     .click(WORK_VIEW)
//   //     .pause(500)
//   //     .elements('css selector', `${TASK_LIST} .task`, (result) => {
//   //       const count = Array.isArray(result.value) ? result.value.length : 0;
//   //       browser.assert.equal(
//   //         count,
//   //         4, // We had 3 tasks, now should have 4
//   //         'Should have created a new task',
//   //       );
//   //     })
//   //     // Go back to plugin
//   //     .click(PLUGIN_MENU_ITEM)
//   //     .pause(1000),
//
//   // 'test save plugin data': (browser: NBrowser) =>
//   //   browser
//   //     .frame(0)
//   //     .click(SAVE_DATA_BTN)
//   //     .frameParent()
//   //     .waitForElementVisible(SNACK_BAR)
//   //     .assert.textContains(SNACK_MESSAGE, 'Data saved')
//   //     .pause(2000)
//   //     .frame(0)
//   //     // Verify log entry shows data was saved
//   //     .elements('css selector', LOG_ENTRY, (result) => {
//   //       if (Array.isArray(result.value) && result.value.length > 0) {
//   //         const lastEntry = result.value[result.value.length - 1];
//   //         if ('ELEMENT' in lastEntry) {
//   //           browser.elementIdText(lastEntry.ELEMENT as string, (textResult) => {
//   //             const text = typeof textResult.value === 'string' ? textResult.value : '';
//   //             browser.assert.ok(
//   //               text.includes('Data saved'),
//   //               'Last log entry should indicate data was saved',
//   //             );
//   //           });
//   //         }
//   //       }
//   //     })
//   //     .frameParent(),
//
//   // 'test iframe maintains state during navigation': (browser: NBrowser) =>
//   //   browser
//   //     // Navigate away
//   //     .click(WORK_VIEW)
//   //     .pause(500)
//   //     // Navigate back
//   //     .click(PLUGIN_MENU_ITEM)
//   //     .pause(1000)
//   //     .frame(0)
//   //     // Check that stats are still loaded (not showing '-')
//   //     .getText(TASK_COUNT, (result) => {
//   //       const value = typeof result.value === 'string' ? result.value : '';
//   //       browser.assert.notEqual(
//   //         value,
//   //         '-',
//   //         'Stats should remain loaded after navigation',
//   //       );
//   //     })
//   //     .frameParent(),
//
//   // 'test dark mode support in iframe': (browser: NBrowser) =>
//   //   browser
//   //     // This test would ideally toggle dark mode in the app
//   //     // For now, we'll just verify the iframe has proper styles
//   //     .frame(0)
//   //     .execute(
//   //       () => {
//   //         // Check if dark mode styles are present
//   //         const styles = window.getComputedStyle(document.body);
//   //         const hasDarkModeMedia = Array.from(document.styleSheets).some((sheet) => {
//   //           try {
//   //             return Array.from(sheet.cssRules || []).some((rule) =>
//   //               rule.cssText?.includes('prefers-color-scheme: dark'),
//   //             );
//   //           } catch (e) {
//   //             return false;
//   //           }
//   //         });
//   //         return hasDarkModeMedia;
//   //       },
//   //       [],
//   //       (result) => {
//   //         browser.assert.ok(result.value, 'Iframe should have dark mode styles defined');
//   //       },
//   //     )
//   //     .frameParent(),
// };
