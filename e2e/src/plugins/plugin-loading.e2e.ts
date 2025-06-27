/* eslint-disable @typescript-eslint/no-unused-vars */
import { NBrowser } from '../../n-browser-interface';
import { cssSelectors } from '../../e2e.const';

const { SIDENAV } = cssSelectors;

/* eslint-disable @typescript-eslint/naming-convention */

// Plugin-related selectors
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;
// const PLUGIN_UPLOAD_BTN = '.e2e-plugin-upload-btn';
// const PLUGIN_FILE_INPUT = 'input[type="file"]';
const PLUGIN_CARD = 'plugin-management mat-card.ng-star-inserted';
const PLUGIN_ITEM = `${PLUGIN_CARD}`;
// const PLUGIN_ENABLE_TOGGLE = '.mat-mdc-slide-toggle';
const PLUGIN_MENU_ENTRY = `${SIDENAV} plugin-menu button`;
const PLUGIN_IFRAME = 'plugin-index iframe';
const SNACK_BAR = 'mat-snack-bar';

module.exports = {
  '@tags': ['plugins'],

  before: (browser: NBrowser) =>
    browser
      .loadAppAndClickAwayWelcomeDialog()
      .navigateToPluginSettings()
      // Enable the API Test Plugin if it's not already enabled
      .execute(() => {
        const items = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const apiTestItem = items.find((item) => {
          const title = item.querySelector('mat-card-title')?.textContent || '';
          return title.includes('API Test Plugin');
        });
        if (apiTestItem) {
          const toggleInput = apiTestItem.querySelector(
            'mat-slide-toggle input',
          ) as HTMLInputElement;
          if (toggleInput && !toggleInput.checked) {
            toggleInput.click();
            return true;
          }
        }
        return false;
      })
      .pause(3000), // Wait for plugin to initialize

  after: (browser: NBrowser) => browser.end(),

  'navigate to plugin management': (browser: NBrowser) =>
    browser.navigateToPluginSettings().waitForElementVisible(PLUGIN_CARD).pause(500),

  'check example plugin is loaded and enabled': (browser: NBrowser) =>
    browser.waitForElementVisible(PLUGIN_ITEM).execute(
      () => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const pluginCards = cards.filter((card) =>
          card.querySelector('mat-slide-toggle'),
        );
        return {
          totalCards: cards.length,
          pluginCardsCount: pluginCards.length,
          pluginTitles: pluginCards.map(
            (card) => card.querySelector('mat-card-title')?.textContent?.trim() || '',
          ),
        };
      },
      [],
      (result) => {
        console.log('Plugin cards found:', result.value);
        const data = result.value as any;
        browser.assert.ok(
          data.pluginCardsCount >= 1,
          'At least one plugin should be loaded',
        );
        browser.assert.ok(
          data.pluginTitles.includes('API Test Plugin'),
          'API Test Plugin should be present',
        );
      },
    ),

  'verify plugin menu entry exists': (browser: NBrowser) =>
    browser
      .click(SIDENAV) // Ensure sidenav is visible
      .waitForElementVisible(PLUGIN_MENU_ENTRY)
      .assert.textContains(PLUGIN_MENU_ENTRY, 'API Test Plugin'),

  'open plugin iframe view': (browser: NBrowser) =>
    browser
      .click(PLUGIN_MENU_ENTRY)
      .waitForElementVisible(PLUGIN_IFRAME)
      .assert.urlContains('/plugins/api-test-plugin/index')
      .pause(1000) // Wait for iframe to load
      .frame(0) // Switch to iframe context
      .waitForElementVisible('h1')
      .assert.textContains('h1', 'API Test Plugin')
      .frameParent() // Switch back to main context
      .pause(500),

  'verify plugin functionality - show notification': (browser: NBrowser) =>
    browser
      // Plugin shows its UI in iframe
      .waitForElementVisible(PLUGIN_MENU_ENTRY)
      .assert.textContains(PLUGIN_MENU_ENTRY, 'API Test Plugin'),

  'disable and re-enable plugin': (browser: NBrowser) =>
    browser
      .navigateToPluginSettings()
      .waitForElementVisible(PLUGIN_ITEM)
      // Find the toggle for API Test Plugin
      .execute(() => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const apiTestCard = cards.find((card) => {
          const title = card.querySelector('mat-card-title')?.textContent || '';
          return title.includes('API Test Plugin');
        });
        const toggle = apiTestCard?.querySelector(
          'mat-slide-toggle input',
        ) as HTMLInputElement;
        if (toggle) toggle.click();
      })
      .pause(500)
      // Verify menu entry is gone
      .click(SIDENAV)
      .assert.not.elementPresent(PLUGIN_MENU_ENTRY)
      // Re-enable the plugin
      .click(SETTINGS_BTN)
      .pause(1000)
      .execute(() => {
        const cards = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const apiTestCard = cards.find((card) => {
          const title = card.querySelector('mat-card-title')?.textContent || '';
          return title.includes('API Test Plugin');
        });
        const toggle = apiTestCard?.querySelector(
          'mat-slide-toggle input',
        ) as HTMLInputElement;
        if (toggle) toggle.click();
      })
      .pause(500)
      // Verify menu entry is back
      .click(SIDENAV)
      .waitForElementVisible(PLUGIN_MENU_ENTRY)
      .assert.textContains(PLUGIN_MENU_ENTRY, 'API Test Plugin'),

  // 'test plugin API interactions in iframe': (browser: NBrowser) =>
  //   browser
  //     .click(PLUGIN_MENU_ENTRY)
  //     .waitForElementVisible(PLUGIN_IFRAME)
  //     .frame(0) // Switch to iframe
  //     // Click refresh stats button
  //     .click('button:nth-of-type(2)')
  //     .pause(500)
  //     // Verify stats are loaded (should show task count)
  //     .waitForElementVisible('#taskCount')
  //     .getText('#taskCount', (result) => {
  //       browser.assert.ok(result.value !== '-', 'Task count should be loaded');
  //     })
  //     // Click show notification button
  //     .click('button:nth-of-type(1)')
  //     .frameParent() // Switch back to main context
  //     .waitForElementVisible(SNACK_BAR)
  //     .assert.textContains(SNACK_BAR, 'Notification from plugin iframe')
  //     .pause(2000),

  // This test is now covered in plugin-upload.e2e.ts which uses the test-plugin.zip from assets
};
