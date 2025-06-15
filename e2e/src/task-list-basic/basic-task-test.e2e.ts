// // import { NBrowser } from '../../n-browser-interface';
//
// module.exports = {
//   // COMMENTED OUT - BASIC TEST
//   /*
//   '@tags': ['task', 'basic-test'],
//
//   before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
//
//   after: (browser: NBrowser) => browser.end(),
//
//   'should create and manage tasks': (browser: NBrowser) => {
//     browser
//       .addTask('First Task')
//       .waitForElementVisible('task', 5000)
//       .assert.valueContains('task textarea', 'First Task');
//     browser.addTask('Second Task').pause(500);
//     return browser.assert
//       .elementPresent('task:nth-child(1)')
//       .assert.elementPresent('task:nth-child(2)')
//       .assert.valueContains('task:nth-child(1) textarea', 'Second Task')
//       .assert.valueContains('task:nth-child(2) textarea', 'First Task');
//   },
//   */
// };
