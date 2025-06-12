/* eslint-disable @typescript-eslint/no-unused-vars */
import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { SIDENAV } = cssSelectors;

/* eslint-disable @typescript-eslint/naming-convention */

// Plugin-related selectors
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
const PLUGIN_TAB = 'mat-tab-link:contains("Plugins")';
const PLUGIN_CARD = 'plugin-management mat-card.ng-star-inserted';
const HELLO_WORLD_PLUGIN = `${PLUGIN_CARD}`;
const PLUGIN_TOGGLE = `${HELLO_WORLD_PLUGIN} .mat-mdc-slide-toggle button[role="switch"]`;
const PLUGIN_MENU = `${SIDENAV} plugin-menu`;
const PLUGIN_MENU_ITEM = `${PLUGIN_MENU} button`;
const SNACK_BAR = 'mat-snack-bar';
const SNACK_MESSAGE = `${SNACK_BAR} .mat-mdc-snack-bar-label`;
const TASK_DONE_BTN = '.task-done-btn';
const PLUGIN_HEADER_BTN = 'plugin-header-btns button';

module.exports = {
  '@tags': ['plugins', 'lifecycle'],

  before: (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog()
      .createAndGoToDefaultProject()
      .navigateToPluginSettings()
      // Enable the hello-world plugin if it's not already enabled
      .execute(() => {
        const items = Array.from(
          document.querySelectorAll('plugin-management mat-card.ng-star-inserted'),
        );
        const helloWorldItem = items.find((item) =>
          item.textContent?.includes('Hello World Plugin'),
        );
        if (helloWorldItem) {
          // Try new button-style toggle first
          const toggleButton = helloWorldItem.querySelector(
            '.mat-mdc-slide-toggle button[role="switch"]',
          ) as HTMLButtonElement;
          if (toggleButton && toggleButton.getAttribute('aria-checked') === 'false') {
            toggleButton.click();
            return true;
          }
          // Fallback to input-style toggle
          const toggleInput = helloWorldItem.querySelector(
            '.mat-mdc-slide-toggle input',
          ) as HTMLInputElement;
          if (toggleInput && !toggleInput.checked) {
            toggleInput.click();
            return true;
          }
        }
        return false;
      })
      .url('http://localhost:4200') // Go back to work view
      .pause(3000), // Wait for plugin to initialize

  after: (browser: NBrowser) => browser.end(),

  'verify plugin is initially loaded': (browser: NBrowser) =>
    browser
      .pause(2000) // Wait for plugins to initialize
      // Plugin doesn't show snack bar on load, check plugin menu instead
      .waitForElementVisible(PLUGIN_MENU_ITEM)
      .assert.textContains(PLUGIN_MENU_ITEM, 'Hello World Plugin'),

  // 'verify plugin menu entry is auto-registered': (browser: NBrowser) =>
  //   browser
  //     .waitForElementVisible(PLUGIN_MENU)
  //     .assert.elementPresent(PLUGIN_MENU_ITEM)
  //     .getText(PLUGIN_MENU_ITEM, (result) => {
  //       browser.assert.equal(result.value, 'Hello World Plugin');
  //     }),

  'test plugin header button': (browser: NBrowser) =>
    browser
      .waitForElementVisible(PLUGIN_HEADER_BTN)
      .click(PLUGIN_HEADER_BTN)
      .pause(500)
      .assert.urlContains('/plugins/hello-world/index')
      .waitForElementVisible('iframe')
      .url('http://localhost:4200'), // Go back to work view

  // 'test plugin hook - task complete notification': (browser: NBrowser) =>
  //   browser
  //     .addTask('Test task for plugin')
  //     .pause(500)
  //     .moveToElement('.task', 10, 10)
  //     .waitForElementVisible(TASK_DONE_BTN)
  //     .click(TASK_DONE_BTN)
  //     .pause(500)
  //     .waitForElementVisible(SNACK_BAR)
  //     .assert.textContains(SNACK_MESSAGE, 'Hello World! Task completed successfully!')
  //     .pause(3000), // Wait for snackbar to disappear

  'disable plugin and verify cleanup': (browser: NBrowser) =>
    browser
      // Navigate to settings
      .navigateToPluginSettings()
      .waitForElementVisible(HELLO_WORLD_PLUGIN)
      // Disable the plugin
      .click(PLUGIN_TOGGLE)
      .pause(1000)
      // Go back and verify menu entry is removed
      .url('http://localhost:4200')
      .pause(500)
      .assert.not.elementPresent(PLUGIN_MENU_ITEM)
      .assert.not.elementPresent(PLUGIN_HEADER_BTN),

  // 're-enable plugin and verify restoration': (browser: NBrowser) =>
  //   browser
  //     // Navigate back to settings
  //     .navigateToPluginSettings()
  //     .waitForElementVisible(HELLO_WORLD_PLUGIN)
  //     // Re-enable the plugin
  //     .click(PLUGIN_TOGGLE)
  //     .pause(2000) // Wait for plugin to reload
  //     // Verify initialization message
  //     .waitForElementVisible(SNACK_BAR, 5000)
  //     .assert.textContains(SNACK_MESSAGE, 'Hello World Plugin initialized!')
  //     .pause(3000)
  //     // Go back and verify menu entry is restored
  //     .url('http://localhost:4200')
  //     .pause(500)
  //     .assert.elementPresent(PLUGIN_MENU_ITEM)
  //     .assert.elementPresent(PLUGIN_HEADER_BTN),

  // 'test plugin persistence across page reload': (browser: NBrowser) =>
  //   browser
  //     // First, open plugin dashboard and interact with it
  //     .click(PLUGIN_MENU_ITEM)
  //     .pause(1000)
  //     .frame(0) // Switch to iframe
  //     .waitForElementVisible('button:contains("Save Data")')
  //     .click('button:contains("Save Data")')
  //     .frameParent()
  //     .waitForElementVisible(SNACK_BAR)
  //     .assert.textContains(SNACK_MESSAGE, 'Data saved')
  //     .pause(2000)
  //     // Reload the page
  //     .refresh()
  //     .pause(3000)
  //     // Verify plugin is still active after reload
  //     .waitForElementVisible(PLUGIN_MENU_ITEM)
  //     .waitForElementVisible(PLUGIN_HEADER_BTN)
  //     // Verify initialization message shows again
  //     .waitForElementVisible(SNACK_BAR, 5000)
  //     .assert.textContains(SNACK_MESSAGE, 'Hello World Plugin initialized!'),
};
