// /* eslint-disable prefer-arrow/prefer-arrow-functions */
// import { NBrowser } from '../../n-browser-interface';
// import * as path from 'path';
//
// /* eslint-disable @typescript-eslint/naming-convention */
//
// // Plugin-related selectors
// const UPLOAD_PLUGIN_BTN = 'plugin-management button[mat-raised-button]'; // The "Choose Plugin File" button
// const FILE_INPUT = 'input[type="file"][accept=".zip"]';
// const PLUGIN_CARD = 'plugin-management mat-card.ng-star-inserted';
//
// // Test plugin details
// const TEST_PLUGIN_NAME = 'Test Upload Plugin';
// const TEST_PLUGIN_ID = 'test-upload-plugin';
//
// module.exports = {
//   '@tags': ['plugins', 'upload'],
//
//   before: function (browser: NBrowser) {
//     browser.loadAppAndClickAwayWelcomeDialog().createAndGoToDefaultProject().pause(3000); // Wait for plugins to initialize
//   },
//
//   after: (browser: NBrowser) => browser.end(),
//
//   'navigate to plugin management': (browser: NBrowser) =>
//     browser.navigateToPluginSettings(),
//
//   'upload plugin ZIP file': function (browser: NBrowser) {
//     // Use the test plugin from assets folder
//     const testPluginPath = path.resolve(
//       __dirname,
//       '../../../../src/assets/test-plugin.zip',
//     );
//
//     browser
//       .waitForElementVisible(UPLOAD_PLUGIN_BTN)
//       .click(UPLOAD_PLUGIN_BTN) // Click the button to trigger file dialog (programmatically)
//       .pause(500)
//       .execute(function () {
//         // Make file input visible for testing
//         const input = document.querySelector(
//           'input[type="file"][accept=".zip"]',
//         ) as HTMLElement;
//         if (input) {
//           input.style.display = 'block';
//           input.style.position = 'relative';
//           input.style.opacity = '1';
//         }
//       })
//       .pause(500)
//       .setValue(FILE_INPUT, testPluginPath)
//       .pause(3000); // Wait for file processing - upload success is verified in next test
//   },
//
//   'verify uploaded plugin appears in list': (browser: NBrowser) =>
//     browser
//       .waitForElementVisible(PLUGIN_CARD)
//       .pause(1000)
//       .execute(
//         function (pluginName: string) {
//           const cards = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           return cards.some((card) => card.textContent?.includes(pluginName));
//         },
//         [TEST_PLUGIN_ID],
//         (result) => {
//           browser.assert.ok(
//             result.value,
//             `Uploaded plugin "${TEST_PLUGIN_NAME}" should appear in list`,
//           );
//         },
//       ),
//
//   'verify uploaded plugin is disabled by default': (browser: NBrowser) =>
//     browser.checkPluginStatus(TEST_PLUGIN_NAME, false),
//
//   'enable uploaded plugin': (browser: NBrowser) =>
//     browser
//       .execute(
//         function (pluginName: string) {
//           // Find and click the toggle for the specific plugin to enable it
//           const items = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           const pluginCard = items.find((item) => item.textContent?.includes(pluginName));
//           if (pluginCard) {
//             const toggle = pluginCard.querySelector(
//               'mat-slide-toggle input',
//             ) as HTMLInputElement;
//             if (toggle) {
//               toggle.click();
//               return true;
//             }
//           }
//           return false;
//         },
//         [TEST_PLUGIN_ID],
//         (result) => {
//           browser.assert.ok(
//             result.value,
//             'Should find and click plugin toggle to enable',
//           );
//         },
//       )
//       .pause(2000) // Longer pause to ensure DOM update completes
//       .checkPluginStatus(TEST_PLUGIN_NAME, true),
//
//   'disable uploaded plugin': (browser: NBrowser) =>
//     browser
//       .execute(
//         function (pluginId: string) {
//           // Find and click the toggle for the specific plugin (now using plugin ID)
//           const items = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           const pluginCard = items.find((item) => item.textContent?.includes(pluginId));
//           if (pluginCard) {
//             const toggle = pluginCard.querySelector(
//               'mat-slide-toggle input',
//             ) as HTMLInputElement;
//             if (toggle) {
//               toggle.click();
//               return true;
//             }
//           }
//           return false;
//         },
//         [TEST_PLUGIN_ID],
//         (result) => {
//           browser.assert.ok(result.value, 'Should find and click plugin toggle');
//         },
//       )
//       .pause(1000)
//       .checkPluginStatus(TEST_PLUGIN_ID, false),
//
//   're-enable uploaded plugin': (browser: NBrowser) =>
//     browser
//       .execute(
//         function (pluginId: string) {
//           const items = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           const pluginCard = items.find((item) => item.textContent?.includes(pluginId));
//           if (pluginCard) {
//             const toggle = pluginCard.querySelector(
//               'mat-slide-toggle input',
//             ) as HTMLInputElement;
//             if (toggle) {
//               toggle.click();
//               return true;
//             }
//           }
//           return false;
//         },
//         [TEST_PLUGIN_ID],
//         (result) => {
//           browser.assert.ok(result.value, 'Should find and click plugin toggle');
//         },
//       )
//       .pause(1000)
//       .checkPluginStatus(TEST_PLUGIN_ID, true),
//
//   'remove uploaded plugin': (browser: NBrowser) =>
//     browser
//       // Find and click the remove button - simplified approach
//       .execute(
//         function (pluginId: string) {
//           const items = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           const pluginCard = items.find((item) => item.textContent?.includes(pluginId));
//           if (pluginCard) {
//             const removeBtn = pluginCard.querySelector(
//               'button[color="warn"]',
//             ) as HTMLElement;
//             if (removeBtn) {
//               removeBtn.click();
//               return true;
//             }
//           }
//           return false;
//         },
//         [TEST_PLUGIN_ID],
//       )
//       .pause(500)
//       // Handle JavaScript alert confirmation (if it appears, the click was successful)
//       .acceptAlert()
//       .pause(3000) // Longer pause for removal to complete
//       // Verify plugin is removed
//       .execute(
//         function (pluginId: string) {
//           const items = Array.from(
//             document.querySelectorAll('plugin-management mat-card'),
//           );
//           const foundPlugin = items.some((item) => item.textContent?.includes(pluginId));
//           return {
//             removed: !foundPlugin,
//             totalCards: items.length,
//             cardTexts: items.map((item) => item.textContent?.trim().substring(0, 50)),
//           };
//         },
//         [TEST_PLUGIN_ID],
//         (result) => {
//           console.log('Removal verification:', result.value);
//           const data = result.value as any;
//           browser.assert.ok(
//             data && data.removed,
//             `Plugin "${TEST_PLUGIN_ID}" should be removed from list`,
//           );
//         },
//       ),
//
//   'verify removal completed': (browser: NBrowser) => browser.pause(1000), // Just ensure the removal process completes
// };
